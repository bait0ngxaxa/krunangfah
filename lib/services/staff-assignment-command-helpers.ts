import { Prisma } from "@prisma/client";
import { ADMIN_ADVISORY_CLASS } from "@/lib/constants/advisory-class";
import type {
    ChangeableRole,
    StaffRoleSelection,
} from "@/types/user-management.types";
import type { SystemAdminEditChange } from "@/lib/actions/system-admin/types";
import type {
    StaffAssignmentActor,
    StaffAssignmentCommand,
} from "./staff-assignment-command";

export const staffTargetSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isPrimary: true,
    schoolId: true,
    deletedAt: true,
    updatedAt: true,
    teacher: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            advisoryClass: true,
            updatedAt: true,
        },
    },
} satisfies Prisma.UserSelect;

export type StaffTarget = Prisma.UserGetPayload<{
    select: typeof staffTargetSelect;
}>;

export interface DesiredAssignment {
    role: "school_admin" | "class_teacher";
    isPrimary: boolean;
    advisoryClass: string | null;
}

export function validateTarget(
    target: StaffTarget | null,
    actor: StaffAssignmentActor,
    input: StaffAssignmentCommand,
): string | null {
    if (!target) return "ไม่พบผู้ใช้งาน";
    if (target.id === actor.id) return "ไม่สามารถเปลี่ยนข้อมูลตัวเอง";
    if (target.role === "system_admin") {
        return "ไม่สามารถเปลี่ยนบทบาทของ System Admin";
    }
    if (target.deletedAt) {
        return input.togglePrimary
            ? "ไม่สามารถเปลี่ยนสิทธิ์บัญชีที่ปิดใช้งานแล้ว"
            : "ผู้ใช้นี้ถูกลบแล้ว";
    }
    if (actor.role === "school_admin" && target.schoolId !== actor.schoolId) {
        return input.togglePrimary
            ? "ไม่สามารถเปลี่ยนสิทธิ์ผู้ดูแลจากโรงเรียนอื่นได้"
            : "ไม่สามารถแก้ไขบุคลากรต่างโรงเรียน";
    }
    return null;
}

export function getDesiredAssignment(
    target: StaffTarget,
    input: StaffAssignmentCommand,
): { desired: DesiredAssignment } | { message: string } {
    if (input.togglePrimary) {
        if (target.role !== "school_admin") {
            return { message: "สามารถเปลี่ยนสิทธิ์ primary ได้เฉพาะ school_admin เท่านั้น" };
        }
        return {
            desired: {
                role: "school_admin",
                isPrimary: !target.isPrimary,
                advisoryClass: target.teacher?.advisoryClass ?? null,
            },
        };
    }
    if (input.advisoryClass !== undefined) {
        if (!target.teacher) return { message: "ไม่พบโปรไฟล์ครู" };
        const advisoryClass = input.advisoryClass.trim();
        const desired: DesiredAssignment = {
            role:
                advisoryClass === ADMIN_ADVISORY_CLASS
                    ? "school_admin"
                    : "class_teacher",
            isPrimary:
                advisoryClass === ADMIN_ADVISORY_CLASS
                    ? target.isPrimary
                    : false,
            advisoryClass,
        };
        if (
            input.roleSelection !== undefined &&
            !isCompatibleRole(input.roleSelection, desired)
        ) {
            return { message: "บทบาทไม่สอดคล้องกับห้องที่ปรึกษา" };
        }
        return { desired };
    }

    if (!input.roleSelection) return { message: "ต้องระบุบทบาทหรือห้องที่ปรึกษา" };
    const roleSelection = normalizeRoleSelection(input.roleSelection);
    if (roleSelection === "primary_school_admin" && target.role !== "school_admin") {
        return {
            message: "สามารถเพิ่มสิทธิ์ Primary Admin ได้เฉพาะ school_admin เท่านั้น",
        };
    }
    if (roleSelection === "class_teacher") {
        if (!target.teacher) {
            return { message: "ผู้ใช้ยังไม่มีโปรไฟล์ครู ไม่สามารถเปลี่ยนเป็นครูประจำชั้นได้" };
        }
        if (target.teacher.advisoryClass === ADMIN_ADVISORY_CLASS) {
            return {
                message: "ผู้ใช้มี advisory class เป็น \"ทุกห้อง\" ต้องแก้ไขให้เป็นห้องเรียนจริงก่อน",
            };
        }
    }

    return {
        desired: {
            role: roleSelection === "class_teacher" ? "class_teacher" : "school_admin",
            isPrimary: roleSelection === "primary_school_admin",
            advisoryClass: target.teacher
                ? roleSelection === "class_teacher"
                    ? target.teacher.advisoryClass
                    : ADMIN_ADVISORY_CLASS
                : null,
        },
    };
}

function normalizeRoleSelection(role: ChangeableRole): StaffRoleSelection {
    return role === "school_admin" ? "angel_teacher" : role;
}

function isCompatibleRole(
    role: ChangeableRole,
    desired: DesiredAssignment,
): boolean {
    const normalized = normalizeRoleSelection(role);
    if (normalized === "class_teacher") return desired.role === "class_teacher";
    return (
        desired.role === "school_admin" &&
        desired.isPrimary === (normalized === "primary_school_admin")
    );
}

export async function validateAdvisoryClass(
    tx: Prisma.TransactionClient,
    target: StaffTarget,
    desired: DesiredAssignment,
): Promise<string | null> {
    if (
        !target.schoolId ||
        !target.teacher ||
        desired.advisoryClass === null ||
        desired.advisoryClass === ADMIN_ADVISORY_CLASS
    ) {
        return null;
    }
    const schoolClass = await tx.schoolClass.findFirst({
        where: { schoolId: target.schoolId, name: desired.advisoryClass },
        select: { id: true },
    });
    return schoolClass ? null : "ไม่พบห้องเรียนนี้ในโรงเรียน";
}

export async function validatePrimaryInvariant(
    tx: Prisma.TransactionClient,
    target: StaffTarget,
    desired: DesiredAssignment,
): Promise<string | null> {
    if (!target.isPrimary || desired.isPrimary) return null;
    const primaryCount = target.schoolId
        ? await tx.user.count({
              where: {
                  schoolId: target.schoolId,
                  role: "school_admin",
                  isPrimary: true,
                  deletedAt: null,
              },
          })
        : 1;
    return primaryCount <= 1
        ? "โรงเรียนนี้มีผู้ดูแลโรงเรียนเพียงคนเดียว ต้องเพิ่มผู้ดูแลโรงเรียนอีกคนก่อนเปลี่ยนบทบาท"
        : null;
}

export async function compareAndSwapUser(
    tx: Prisma.TransactionClient,
    target: StaffTarget,
    desired: DesiredAssignment,
): Promise<boolean> {
    const result = await tx.user.updateMany({
        where: {
            id: target.id,
            updatedAt: target.updatedAt,
            role: target.role,
            isPrimary: target.isPrimary,
            deletedAt: null,
        },
        data: { role: desired.role, isPrimary: desired.isPrimary },
    });
    return result.count === 1;
}

export async function compareAndSwapTeacher(
    tx: Prisma.TransactionClient,
    target: StaffTarget,
    desired: DesiredAssignment,
): Promise<boolean> {
    if (!target.teacher || desired.advisoryClass === null) return false;
    const result = await tx.teacher.updateMany({
        where: {
            userId: target.id,
            updatedAt: target.teacher.updatedAt,
            advisoryClass: target.teacher.advisoryClass,
        },
        data: { advisoryClass: desired.advisoryClass },
    });
    return result.count === 1;
}

export function getAssignmentChanges(
    target: StaffTarget,
    desired: DesiredAssignment,
): SystemAdminEditChange[] {
    const changes = [];
    if (target.role !== desired.role) {
        changes.push({ field: "role", label: "บทบาทบัญชี", before: target.role, after: desired.role });
    }
    if (target.isPrimary !== desired.isPrimary) {
        changes.push({ field: "isPrimary", label: "Primary Admin", before: target.isPrimary, after: desired.isPrimary });
    }
    const currentClass = target.teacher?.advisoryClass ?? null;
    if (currentClass !== desired.advisoryClass) {
        changes.push({ field: "advisoryClass", label: "ห้องที่ปรึกษา", before: currentClass, after: desired.advisoryClass });
    }
    return changes;
}

export function getTargetLabel(target: StaffTarget): string {
    if (target.teacher) return `${target.teacher.firstName} ${target.teacher.lastName}`;
    return target.name ?? target.email;
}

export function hasUserChange(target: StaffTarget, desired: DesiredAssignment): boolean {
    return target.role !== desired.role || target.isPrimary !== desired.isPrimary;
}

export function hasTeacherChange(target: StaffTarget, desired: DesiredAssignment): boolean {
    return (target.teacher?.advisoryClass ?? null) !== desired.advisoryClass;
}

type CommandNormalization =
    | { success: true; value: StaffAssignmentCommand }
    | { success: false; message: string };

export function normalizeCommand(input: StaffAssignmentCommand): CommandNormalization {
    const advisoryClass = input.advisoryClass?.trim();
    const optionCount = [
        input.roleSelection !== undefined,
        advisoryClass !== undefined,
        input.togglePrimary === true,
    ].filter(Boolean).length;
    if (optionCount !== 1) {
        return { success: false, message: "ต้องระบุบทบาทหรือห้องที่ปรึกษา" };
    }
    return { success: true, value: { ...input, advisoryClass } };
}

export function isAllowedActor(actor: StaffAssignmentActor): boolean {
    return (
        actor.role === "system_admin" ||
        (actor.role === "school_admin" && actor.isPrimary)
    );
}

export function unchanged(message: string): {
    success: false;
    changed: false;
    message: string;
} {
    return { success: false, changed: false, message };
}

export function isTransactionConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function waitBeforeRetry(attempt: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
}
