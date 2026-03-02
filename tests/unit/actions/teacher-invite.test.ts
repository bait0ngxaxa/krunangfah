import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// Teacher Invite — Business Logic Unit Tests
// Pattern: extracted pure logic (no Prisma mock required)
// Files: lib/actions/teacher-invite/mutations.ts
//        lib/actions/teacher-invite/queries.ts
// ═══════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────

type UserRole = "system_admin" | "school_admin" | "class_teacher";

interface SessionUser {
    id: string;
    role: UserRole;
    schoolId: string | null;
    isPrimary?: boolean;
}

interface InviteRecord {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    acceptedAt: Date | null;
    expiresAt: Date;
    schoolId: string;
}

// ─── createTeacherInvite: role authorization logic ──────

/**
 * Pure logic: can this role create a teacher invite?
 * Mirrors: mutations.ts lines 23-31
 */
const canCreateInvite = (role: UserRole): boolean => {
    return role === "system_admin" || role === "school_admin";
};

describe("createTeacherInvite — role authorization", () => {
    it("system_admin สามารถสร้าง invite ได้", () => {
        expect(canCreateInvite("system_admin")).toBe(true);
    });

    it("school_admin สามารถสร้าง invite ได้", () => {
        expect(canCreateInvite("school_admin")).toBe(true);
    });

    it("class_teacher ไม่สามารถสร้าง invite ได้", () => {
        expect(canCreateInvite("class_teacher")).toBe(false);
    });
});

// ─── createTeacherInvite: duplicate email check ──────────

/**
 * Pure logic: is this email already taken or pending?
 * Mirrors: mutations.ts lines 46-72
 */
const getCreateInviteBlockReason = (
    emailExistsInUsers: boolean,
    hasPendingInvite: boolean,
): string | null => {
    if (emailExistsInUsers) return "อีเมลนี้มีผู้ใช้งานแล้ว";
    if (hasPendingInvite) return "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว";
    return null;
};

describe("createTeacherInvite — duplicate checks", () => {
    it("บล็อกถ้า email มีผู้ใช้งานแล้ว", () => {
        expect(getCreateInviteBlockReason(true, false)).toBe(
            "อีเมลนี้มีผู้ใช้งานแล้ว",
        );
    });

    it("บล็อกถ้ามี pending invite อยู่แล้ว", () => {
        expect(getCreateInviteBlockReason(false, true)).toBe(
            "มีคำเชิญที่รอดำเนินการสำหรับอีเมลนี้แล้ว",
        );
    });

    it("ผ่านถ้าไม่มีทั้ง duplicate user และ pending invite", () => {
        expect(getCreateInviteBlockReason(false, false)).toBeNull();
    });

    it("บล็อก email ก่อน pending invite (priority)", () => {
        // Both true — email check should take priority
        expect(getCreateInviteBlockReason(true, true)).toBe(
            "อีเมลนี้มีผู้ใช้งานแล้ว",
        );
    });
});

// ─── acceptTeacherInvite: invite validation ──────────────

/**
 * Pure logic: is this invite valid to accept?
 * Mirrors: mutations.ts lines 136-146
 */
const validateInviteForAccept = (
    invite: InviteRecord | null,
): { valid: boolean; message: string } => {
    if (!invite) return { valid: false, message: "ไม่พบคำเชิญ" };
    if (invite.acceptedAt)
        return { valid: false, message: "คำเชิญนี้ถูกใช้งานแล้ว" };
    if (invite.expiresAt < new Date())
        return { valid: false, message: "คำเชิญหมดอายุแล้ว" };
    return { valid: true, message: "OK" };
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 1000);

const baseInvite: InviteRecord = {
    id: "inv-1",
    email: "teacher@school.ac.th",
    firstName: "สมชาย",
    lastName: "ใจดี",
    acceptedAt: null,
    expiresAt: futureDate,
    schoolId: "school-1",
};

describe("acceptTeacherInvite — invite validation", () => {
    it("reject เมื่อไม่พบ invite", () => {
        const result = validateInviteForAccept(null);
        expect(result.valid).toBe(false);
        expect(result.message).toBe("ไม่พบคำเชิญ");
    });

    it("reject เมื่อ invite ถูกใช้งานแล้ว (acceptedAt มีค่า)", () => {
        const result = validateInviteForAccept({
            ...baseInvite,
            acceptedAt: new Date("2024-01-01"),
        });
        expect(result.valid).toBe(false);
        expect(result.message).toBe("คำเชิญนี้ถูกใช้งานแล้ว");
    });

    it("reject เมื่อ invite หมดอายุแล้ว", () => {
        const result = validateInviteForAccept({
            ...baseInvite,
            expiresAt: pastDate,
        });
        expect(result.valid).toBe(false);
        expect(result.message).toBe("คำเชิญหมดอายุแล้ว");
    });

    it("ผ่านเมื่อ invite ยังไม่ถูกใช้และยังไม่หมดอายุ", () => {
        const result = validateInviteForAccept(baseInvite);
        expect(result.valid).toBe(true);
    });
});

// ─── revokeTeacherInvite: access control ─────────────────

/**
 * Pure logic: can this user revoke this invite?
 * Mirrors: mutations.ts lines 233-241
 */
const canRevokeInvite = (
    actor: SessionUser,
    invite: Pick<InviteRecord, "acceptedAt" | "schoolId">,
): { allowed: boolean; message?: string } => {
    if (invite.acceptedAt) {
        return {
            allowed: false,
            message: "คำเชิญนี้ถูกใช้งานแล้ว ไม่สามารถยกเลิกได้",
        };
    }

    const isSystemAdmin = actor.role === "system_admin";
    const isPrimaryOfSchool =
        actor.role === "school_admin" &&
        actor.isPrimary === true &&
        actor.schoolId === invite.schoolId;

    if (!isSystemAdmin && !isPrimaryOfSchool) {
        return { allowed: false, message: "ไม่มีสิทธิ์ยกเลิกคำเชิญ" };
    }

    return { allowed: true };
};

describe("revokeTeacherInvite — access control", () => {
    const pendingInvite = { acceptedAt: null, schoolId: "school-1" };
    const acceptedInvite = { acceptedAt: new Date(), schoolId: "school-1" };

    it("system_admin ยกเลิก invite ไหนก็ได้", () => {
        const actor: SessionUser = {
            id: "admin-1",
            role: "system_admin",
            schoolId: null,
        };
        expect(canRevokeInvite(actor, pendingInvite).allowed).toBe(true);
    });

    it("primary school_admin ยกเลิก invite ของโรงเรียนตัวเองได้", () => {
        const actor: SessionUser = {
            id: "sa-1",
            role: "school_admin",
            schoolId: "school-1",
            isPrimary: true,
        };
        expect(canRevokeInvite(actor, pendingInvite).allowed).toBe(true);
    });

    it("primary school_admin ยกเลิก invite ของโรงเรียนอื่นไม่ได้", () => {
        const actor: SessionUser = {
            id: "sa-1",
            role: "school_admin",
            schoolId: "school-2",
            isPrimary: true,
        };
        const result = canRevokeInvite(actor, pendingInvite);
        expect(result.allowed).toBe(false);
        expect(result.message).toBe("ไม่มีสิทธิ์ยกเลิกคำเชิญ");
    });

    it("non-primary school_admin ยกเลิกไม่ได้", () => {
        const actor: SessionUser = {
            id: "sa-2",
            role: "school_admin",
            schoolId: "school-1",
            isPrimary: false,
        };
        const result = canRevokeInvite(actor, pendingInvite);
        expect(result.allowed).toBe(false);
        expect(result.message).toBe("ไม่มีสิทธิ์ยกเลิกคำเชิญ");
    });

    it("class_teacher ยกเลิกไม่ได้", () => {
        const actor: SessionUser = {
            id: "t-1",
            role: "class_teacher",
            schoolId: "school-1",
        };
        const result = canRevokeInvite(actor, pendingInvite);
        expect(result.allowed).toBe(false);
        expect(result.message).toBe("ไม่มีสิทธิ์ยกเลิกคำเชิญ");
    });

    it("ยกเลิก invite ที่ถูกใช้แล้วไม่ได้ (แม้จะเป็น system_admin)", () => {
        const actor: SessionUser = {
            id: "admin-1",
            role: "system_admin",
            schoolId: null,
        };
        const result = canRevokeInvite(actor, acceptedInvite);
        expect(result.allowed).toBe(false);
        expect(result.message).toBe(
            "คำเชิญนี้ถูกใช้งานแล้ว ไม่สามารถยกเลิกได้",
        );
    });
});

// ─── getTeacherInvite: token validation ──────────────────

/**
 * Pure logic: validate invite status before showing to user
 * Mirrors: queries.ts lines 20-32
 */
const validateInviteToken = (
    invite: InviteRecord | null,
): { valid: boolean; message: string } => {
    if (!invite) return { valid: false, message: "ไม่พบคำเชิญ" };
    if (invite.acceptedAt)
        return { valid: false, message: "คำเชิญนี้ถูกใช้งานแล้ว" };
    if (invite.expiresAt < new Date())
        return { valid: false, message: "คำเชิญหมดอายุแล้ว" };
    return { valid: true, message: "พบคำเชิญ" };
};

describe("getTeacherInvite — token validation", () => {
    it("reject เมื่อไม่พบ invite (token ไม่ถูกต้อง)", () => {
        const result = validateInviteToken(null);
        expect(result.valid).toBe(false);
        expect(result.message).toBe("ไม่พบคำเชิญ");
    });

    it("reject เมื่อ invite ถูกใช้งานแล้ว", () => {
        const result = validateInviteToken({
            ...baseInvite,
            acceptedAt: new Date("2024-01-01"),
        });
        expect(result.valid).toBe(false);
        expect(result.message).toBe("คำเชิญนี้ถูกใช้งานแล้ว");
    });

    it("reject เมื่อ invite หมดอายุแล้ว", () => {
        const result = validateInviteToken({
            ...baseInvite,
            expiresAt: pastDate,
        });
        expect(result.valid).toBe(false);
        expect(result.message).toBe("คำเชิญหมดอายุแล้ว");
    });

    it("ผ่านเมื่อ invite valid", () => {
        const result = validateInviteToken(baseInvite);
        expect(result.valid).toBe(true);
        expect(result.message).toBe("พบคำเชิญ");
    });
});

// ─── getMyTeacherInvites: schoolId fallback logic ────────

/**
 * Pure logic: resolve schoolId from session or DB fallback
 * Mirrors: queries.ts lines 47-57
 */
const resolveSchoolId = (
    sessionSchoolId: string | null | undefined,
    dbSchoolId: string | null | undefined,
): string | null => {
    return sessionSchoolId ?? dbSchoolId ?? null;
};

describe("getMyTeacherInvites — schoolId fallback", () => {
    it("ใช้ schoolId จาก session ถ้ามี", () => {
        expect(resolveSchoolId("school-1", "school-2")).toBe("school-1");
    });

    it("ใช้ schoolId จาก DB fallback ถ้า session ไม่มี (null)", () => {
        expect(resolveSchoolId(null, "school-from-db")).toBe("school-from-db");
    });

    it("ใช้ schoolId จาก DB fallback ถ้า session ไม่มี (undefined)", () => {
        expect(resolveSchoolId(undefined, "school-from-db")).toBe(
            "school-from-db",
        );
    });

    it("คืนค่า null ถ้าทั้ง session และ DB ไม่มี schoolId", () => {
        expect(resolveSchoolId(null, null)).toBeNull();
    });

    it("คืนค่า null ถ้า DB fallback เป็น undefined", () => {
        expect(resolveSchoolId(null, undefined)).toBeNull();
    });
});
