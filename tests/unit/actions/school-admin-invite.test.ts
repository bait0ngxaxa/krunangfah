import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    acceptSchoolAdminInvite,
    createSchoolAdminInvite,
} from "@/lib/actions/school-admin-invite.actions";

type SchoolAdminInviteRecord = {
    id: string;
    token: string;
    email: string;
    role: "system_admin" | "school_admin";
    usedAt: Date | null;
    expiresAt: Date;
    createdBy: string;
    createdAt: Date;
};

type CountResult = {
    count: number;
};

type TransactionClient = {
    user: {
        create: typeof prismaMocks.mockUserCreate;
    };
    systemAdminWhitelist: {
        upsert: typeof prismaMocks.mockSystemAdminWhitelistUpsert;
    };
    schoolAdminInvite: {
        findUnique: typeof prismaMocks.mockSchoolAdminInviteFindUnique;
        update: typeof prismaMocks.mockSchoolAdminInviteUpdate;
        updateMany: typeof prismaMocks.mockSchoolAdminInviteUpdateMany;
    };
};

const prismaMocks = vi.hoisted(() => ({
    mockTransaction: vi.fn(),
    mockUserCreate: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockSystemAdminWhitelistUpsert: vi.fn(),
    mockSchoolAdminInviteCreate: vi.fn(),
    mockSchoolAdminInviteDeleteMany: vi.fn(),
    mockSchoolAdminInviteFindFirst: vi.fn(),
    mockSchoolAdminInviteFindUnique: vi.fn(),
    mockSchoolAdminInviteUpdate: vi.fn(),
    mockSchoolAdminInviteUpdateMany: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
    mockHashPassword: vi.fn(),
    mockRequireAdmin: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        user: {
            create: prismaMocks.mockUserCreate,
            findUnique: prismaMocks.mockUserFindUnique,
        },
        systemAdminWhitelist: {
            upsert: prismaMocks.mockSystemAdminWhitelistUpsert,
        },
        schoolAdminInvite: {
            create: prismaMocks.mockSchoolAdminInviteCreate,
            deleteMany: prismaMocks.mockSchoolAdminInviteDeleteMany,
            findFirst: prismaMocks.mockSchoolAdminInviteFindFirst,
            findUnique: prismaMocks.mockSchoolAdminInviteFindUnique,
            update: prismaMocks.mockSchoolAdminInviteUpdate,
            updateMany: prismaMocks.mockSchoolAdminInviteUpdateMany,
        },
        $transaction: prismaMocks.mockTransaction,
    },
}));

vi.mock("@/lib/auth/user", () => ({
    hashPassword: authMocks.mockHashPassword,
}));

vi.mock("@/lib/auth/session", () => ({
    requireAdmin: authMocks.mockRequireAdmin,
}));

vi.mock("@/lib/rate-limit", () => ({
    createRateLimiter: () => ({
        check: async () => ({
            allowed: true,
            limit: 8,
            remaining: 7,
            resetAt: 0,
            retryAfterSeconds: 0,
        }),
        cleanup: async () => undefined,
        destroy: async () => undefined,
    }),
    extractRateLimitKey: () => "127.0.0.1",
    TRUSTED_PROXY_HEADERS: { trustProxyHeaders: true },
}));

vi.mock("next/headers", () => ({
    headers: async () => ({
        get: () => "127.0.0.1",
    }),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

function createInviteRecord(
    overrides: Partial<SchoolAdminInviteRecord> = {},
): SchoolAdminInviteRecord {
    return {
        id: "invite-1",
        token: "token-hash",
        email: "admin@example.test",
        role: "system_admin",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdBy: "creator-1",
        createdAt: new Date(),
        ...overrides,
    } satisfies SchoolAdminInviteRecord;
}

function createTransactionClient(): TransactionClient {
    return {
        user: {
            create: prismaMocks.mockUserCreate,
        },
        systemAdminWhitelist: {
            upsert: prismaMocks.mockSystemAdminWhitelistUpsert,
        },
        schoolAdminInvite: {
            findUnique: prismaMocks.mockSchoolAdminInviteFindUnique,
            update: prismaMocks.mockSchoolAdminInviteUpdate,
            updateMany: prismaMocks.mockSchoolAdminInviteUpdateMany,
        },
    };
}

describe("acceptSchoolAdminInvite", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        const transactionClient = createTransactionClient();
        prismaMocks.mockTransaction.mockImplementation(
            <T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> =>
                callback(transactionClient),
        );
        authMocks.mockHashPassword.mockResolvedValue("hashed-password");
        prismaMocks.mockUserCreate.mockResolvedValue({
            id: "created-user",
            email: "admin@example.test",
        });
        prismaMocks.mockSystemAdminWhitelistUpsert.mockResolvedValue({
            id: "whitelist-1",
        });
        prismaMocks.mockSchoolAdminInviteUpdate.mockResolvedValue(
            createInviteRecord({ usedAt: new Date() }),
        );
    });

    it("rejects an invalid token before hashing", async () => {
        prismaMocks.mockSchoolAdminInviteFindUnique.mockResolvedValue(null);

        const result = await acceptSchoolAdminInvite(
            "invalid-token",
            "StrongPassword123!",
        );

        expect(result.success).toBe(false);
        expect(authMocks.mockHashPassword).not.toHaveBeenCalled();
        expect(prismaMocks.mockTransaction).not.toHaveBeenCalled();
    });

    it("claims an invite token once when the same token is accepted concurrently", async () => {
        let claimAttempts = 0;
        const pendingInvite = createInviteRecord();
        const usedInvite = createInviteRecord({ usedAt: new Date() });

        prismaMocks.mockSchoolAdminInviteUpdateMany.mockImplementation(
            async (): Promise<CountResult> => {
                claimAttempts += 1;
                return { count: claimAttempts === 1 ? 1 : 0 };
            },
        );
        prismaMocks.mockSchoolAdminInviteFindUnique.mockImplementation(
            async (): Promise<SchoolAdminInviteRecord> =>
                claimAttempts <= 1 ? pendingInvite : usedInvite,
        );

        const results = await Promise.all([
            acceptSchoolAdminInvite("same-token", "StrongPassword123!"),
            acceptSchoolAdminInvite("same-token", "StrongPassword123!"),
        ]);

        expect(results.filter((result) => result.success)).toHaveLength(1);
        expect(prismaMocks.mockUserCreate).toHaveBeenCalledTimes(1);
        expect(
            prismaMocks.mockSchoolAdminInviteUpdateMany,
        ).toHaveBeenCalledWith({
            where: expect.objectContaining({
                usedAt: null,
                expiresAt: { gt: expect.any(Date) },
            }),
            data: { usedAt: expect.any(Date) },
        });
    });
});

describe("createSchoolAdminInvite", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        authMocks.mockRequireAdmin.mockResolvedValue({
            user: { id: "system-admin-1", role: "system_admin" },
        });
        prismaMocks.mockUserFindUnique.mockResolvedValue(null);
        prismaMocks.mockSchoolAdminInviteFindFirst.mockResolvedValue(null);
        prismaMocks.mockSchoolAdminInviteCreate.mockResolvedValue(
            createInviteRecord(),
        );
    });

    it("allows re-inviting a deleted user with the same email", async () => {
        const result = await createSchoolAdminInvite(
            "ADMIN@EXAMPLE.TEST",
            "school_admin",
        );

        expect(result.success).toBe(true);
        expect(prismaMocks.mockSchoolAdminInviteDeleteMany).toHaveBeenCalledWith({
            where: { email: "admin@example.test" },
        });
        expect(prismaMocks.mockSchoolAdminInviteCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                email: "admin@example.test",
                role: "school_admin",
                createdBy: "system-admin-1",
            }),
        });
    });
});
