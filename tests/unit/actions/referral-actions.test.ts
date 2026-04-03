import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createStudentReferral,
    getTeachersForReferral,
} from "@/lib/actions/referral.actions";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        student: {
            findUnique: vi.fn(),
        },
        teacher: {
            findMany: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        },
        studentReferral: {
            upsert: vi.fn(),
        },
    },
}));

vi.mock("@/lib/session", () => ({
    isSystemAdmin: vi.fn((role: string) => role === "system_admin"),
    requireAuth: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidateTag: vi.fn(),
}));

vi.mock("@/lib/utils/logging", () => ({
    logError: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const validStudentId = "cmaaaaaaa0000000000000001";
const validSchoolAdminUserId = "cmaaaaaaa0000000000000002";
const validClassTeacherUserId = "cmaaaaaaa0000000000000003";

describe("referral actions business rules", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("createStudentReferral", () => {
        it("allows class_teacher to refer only students in advisoryClass", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: validClassTeacherUserId, role: "class_teacher" },
            } as never);

            vi.mocked(prisma.student.findUnique).mockResolvedValue({
                id: validStudentId,
                class: "ม.1/1",
                schoolId: "school-1",
                referral: null,
            } as never);

            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({
                    schoolId: "school-1",
                    teacher: {
                        advisoryClass: "ม.1/1",
                        firstName: "ครู",
                        lastName: "ประจำชั้น",
                    },
                } as never)
                .mockResolvedValueOnce({
                    id: validSchoolAdminUserId,
                    schoolId: "school-1",
                    teacher: {
                        firstName: "ครู",
                        lastName: "นางฟ้า",
                    },
                } as never)
                .mockResolvedValueOnce({
                    role: "school_admin",
                } as never);

            vi.mocked(prisma.studentReferral.upsert).mockResolvedValue({
                id: "ref-1",
                studentId: validStudentId,
                fromTeacherUserId: validClassTeacherUserId,
                toTeacherUserId: validSchoolAdminUserId,
                createdAt: new Date("2026-04-03T00:00:00.000Z"),
            } as never);

            const result = await createStudentReferral({
                studentId: validStudentId,
                toTeacherUserId: validSchoolAdminUserId,
            });

            expect(result.success).toBe(true);
            expect(prisma.studentReferral.upsert).toHaveBeenCalledOnce();
        });

        it("rejects class_teacher when student is outside advisoryClass", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: validClassTeacherUserId, role: "class_teacher" },
            } as never);

            vi.mocked(prisma.student.findUnique).mockResolvedValue({
                id: validStudentId,
                class: "ม.2/1",
                schoolId: "school-1",
                referral: {
                    toTeacherUserId: validSchoolAdminUserId,
                },
            } as never);

            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({
                    schoolId: "school-1",
                    teacher: {
                        advisoryClass: "ม.1/1",
                        firstName: "ครู",
                        lastName: "ประจำชั้น",
                    },
                } as never)
                .mockResolvedValueOnce({
                    id: validSchoolAdminUserId,
                    schoolId: "school-1",
                    teacher: {
                        firstName: "ครู",
                        lastName: "นางฟ้า",
                    },
                } as never)
                .mockResolvedValueOnce({
                    role: "school_admin",
                } as never);

            const result = await createStudentReferral({
                studentId: validStudentId,
                toTeacherUserId: validSchoolAdminUserId,
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe(
                "คุณสามารถส่งต่อได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
            );
            expect(prisma.studentReferral.upsert).not.toHaveBeenCalled();
        });

        it("rejects referral target that is not school_admin", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: validClassTeacherUserId, role: "class_teacher" },
            } as never);

            vi.mocked(prisma.student.findUnique).mockResolvedValue({
                id: validStudentId,
                class: "ม.1/1",
                schoolId: "school-1",
                referral: null,
            } as never);

            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({
                    schoolId: "school-1",
                    teacher: {
                        advisoryClass: "ม.1/1",
                        firstName: "ครู",
                        lastName: "ประจำชั้น",
                    },
                } as never)
                .mockResolvedValueOnce({
                    id: validSchoolAdminUserId,
                    schoolId: "school-1",
                    teacher: {
                        firstName: "ครู",
                        lastName: "ปลายทาง",
                    },
                } as never)
                .mockResolvedValueOnce({
                    role: "class_teacher",
                } as never);

            const result = await createStudentReferral({
                studentId: validStudentId,
                toTeacherUserId: validSchoolAdminUserId,
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe("สามารถส่งต่อให้ครูนางฟ้าเท่านั้น");
        });
    });

    describe("getTeachersForReferral", () => {
        it("returns only school_admin options for class_teacher", async () => {
            vi.mocked(requireAuth).mockResolvedValue({
                user: { id: validClassTeacherUserId, role: "class_teacher" },
            } as never);

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                schoolId: "school-1",
            } as never);

            vi.mocked(prisma.teacher.findMany).mockResolvedValue([
                {
                    userId: validSchoolAdminUserId,
                    firstName: "ครู",
                    lastName: "นางฟ้า",
                    advisoryClass: "ทุกห้อง",
                },
            ] as never);

            const result = await getTeachersForReferral();

            expect(prisma.teacher.findMany).toHaveBeenCalledWith({
                where: {
                    user: {
                        schoolId: "school-1",
                        id: { not: validClassTeacherUserId },
                        role: "school_admin",
                    },
                },
                select: {
                    userId: true,
                    firstName: true,
                    lastName: true,
                    advisoryClass: true,
                },
                orderBy: [{ advisoryClass: "asc" }, { firstName: "asc" }],
            });
            expect(result).toEqual([
                {
                    userId: validSchoolAdminUserId,
                    name: "ครู นางฟ้า",
                    advisoryClass: "ทุกห้อง",
                },
            ]);
        });
    });
});
