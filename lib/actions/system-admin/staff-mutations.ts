import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { prisma } from "@/lib/database/prisma";
import type { SystemTeacherProfileEditInput } from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";
import type { Actor } from "./mutations";
import type {
    StaffEntityResult,
    SystemAdminEditChange,
    SystemEditResponse,
} from "./types";

type TeacherForEdit = NonNullable<Awaited<ReturnType<typeof getTeacherForEdit>>>;

export async function updateSystemTeacherProfile(
    input: SystemTeacherProfileEditInput,
    actor: Actor,
): Promise<SystemEditResponse<StaffEntityResult>> {
    const teacher = await getTeacherForEdit(input.id);
    if (!teacher) return { success: false, message: "ไม่พบโปรไฟล์ครู" };
    if (teacher.user.deletedAt) {
        return { success: false, message: "บัญชีนี้ถูกปิดใช้งานแล้ว" };
    }

    const changes = getTeacherProfileChanges(teacher, input);
    if (changes.length === 0) {
        return { success: false, message: "ไม่มีข้อมูลเปลี่ยนแปลง" };
    }

    const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.teacher.update({
            where: { userId: input.id },
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                age: input.age,
                schoolRole: input.schoolRole,
                projectRole: input.projectRole,
            },
            select: teacherEntitySelect,
        });
        await createSystemAdminEditEvent({
            tx,
            targetType: "teacher",
            targetId: teacher.id,
            targetLabel: `${teacher.firstName} ${teacher.lastName}`,
            reason: input.reason,
            actor,
            changes,
        });
        return toStaffEntityResult(next);
    });

    revalidateDashboardCache();
    revalidatePath("/admin/system");
    return { success: true, message: "แก้ไขโปรไฟล์ครูสำเร็จ", updated };
}

const teacherEntitySelect = {
    id: true,
    firstName: true,
    lastName: true,
    age: true,
    advisoryClass: true,
    schoolRole: true,
    projectRole: true,
    user: {
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isPrimary: true,
            deletedAt: true,
            schoolId: true,
            school: { select: { name: true } },
        },
    },
} satisfies Prisma.TeacherSelect;

function getTeacherForEdit(userId: string) {
    return prisma.teacher.findUnique({
        where: { userId },
        select: teacherEntitySelect,
    });
}

function getTeacherProfileChanges(
    teacher: TeacherForEdit,
    input: SystemTeacherProfileEditInput,
): SystemAdminEditChange[] {
    return [
        createChange("firstName", "ชื่อ", teacher.firstName, input.firstName),
        createChange("lastName", "นามสกุล", teacher.lastName, input.lastName),
        createChange("age", "อายุ", teacher.age, input.age),
        createChange("schoolRole", "บทบาทในโรงเรียน", teacher.schoolRole, input.schoolRole),
        createChange("projectRole", "บทบาทโครงการ", teacher.projectRole, input.projectRole),
    ].filter((change): change is SystemAdminEditChange => change !== null);
}

function createChange(
    field: string,
    label: string,
    before: SystemAdminEditChange["before"],
    after: SystemAdminEditChange["after"],
): SystemAdminEditChange | null {
    if (before === after) return null;
    return { field, label, before, after };
}

function toStaffEntityResult(teacher: TeacherForEdit): StaffEntityResult {
    return {
        type: "staff",
        id: teacher.user.id,
        email: teacher.user.email,
        name: teacher.user.name,
        role: teacher.user.role,
        isPrimary: teacher.user.isPrimary,
        deletedAt: teacher.user.deletedAt,
        schoolId: teacher.user.schoolId,
        schoolName: teacher.user.school?.name ?? null,
        hasTeacherProfile: true,
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        age: teacher.age,
        advisoryClass: teacher.advisoryClass,
        schoolRole: teacher.schoolRole,
        projectRole: teacher.projectRole,
    };
}
