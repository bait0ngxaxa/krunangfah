import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import type {
    SystemAdminEditChange,
    SystemEditResponse,
    SchoolEntityResult,
    StudentEntityResult,
} from "./types";
import type {
    SystemSchoolEditInput,
    SystemStudentEditInput,
} from "@/lib/validations/system-admin.validation";
import { createSystemAdminEditEvent } from "./events";

export interface Actor {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
}

type SchoolForEdit = NonNullable<Awaited<ReturnType<typeof getSchoolForEdit>>>;
type StudentForEdit = NonNullable<Awaited<ReturnType<typeof getStudentForEdit>>>;

export async function updateSystemSchool(
    input: SystemSchoolEditInput,
    actor: Actor,
): Promise<SystemEditResponse<SchoolEntityResult>> {
    const school = await getSchoolForEdit(input.id);
    if (!school) return { success: false, message: "ไม่พบโรงเรียน" };

    const changes = getSchoolChanges(school, input);
    if (changes.length === 0) {
        return { success: false, message: "ไม่มีข้อมูลเปลี่ยนแปลง" };
    }

    const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.school.update({
            where: { id: input.id },
            data: { name: input.name, province: input.province || null },
            select: schoolEntitySelect,
        });
        await createSystemAdminEditEvent({
            tx,
            targetType: "school",
            targetId: school.id,
            targetLabel: school.name,
            reason: input.reason,
            actor,
            changes,
        });
        return toSchoolEntityResult(next);
    });

    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/data-management");
    return { success: true, message: "แก้ไขโรงเรียนสำเร็จ", updated };
}

export async function updateSystemStudent(
    input: SystemStudentEditInput,
    actor: Actor,
): Promise<SystemEditResponse<StudentEntityResult>> {
    const student = await getStudentForEdit(input.id);
    if (!student) return { success: false, message: "ไม่พบนักเรียน" };

    const normalized = normalizeStudentInput(input);
    const changes = getStudentChanges(student, normalized);
    if (changes.length === 0) {
        return { success: false, message: "ไม่มีข้อมูลเปลี่ยนแปลง" };
    }

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const next = await tx.student.update({
                where: { id: input.id },
                data: {
                    studentId: normalized.studentId,
                    nationalId: normalized.nationalId,
                    firstName: normalized.firstName,
                    lastName: normalized.lastName,
                    gender: normalized.gender,
                    age: normalized.age,
                    class: normalized.class,
                    status: normalized.status,
                    statusChangedAt:
                        student.status === normalized.status
                            ? student.statusChangedAt
                            : new Date(),
                },
                select: studentEntitySelect,
            });
            await createSystemAdminEditEvent({
                tx,
                targetType: "student",
                targetId: student.id,
                targetLabel: `${student.firstName} ${student.lastName}`,
                reason: input.reason,
                actor,
                changes,
            });
            return toStudentEntityResult(next);
        });

        revalidateStudentsCache(student.schoolId, student.id);
        await revalidateAnalyticsCache(student.schoolId);
        revalidatePath("/admin/system");
        revalidatePath("/admin/data-management");
        return { success: true, message: "แก้ไขนักเรียนสำเร็จ", updated };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return { success: false, message: "รหัสนักเรียนหรือเลขบัตรซ้ำในระบบ" };
        }
        throw error;
    }
}

const schoolEntitySelect = {
    id: true,
    name: true,
    province: true,
    disabledAt: true,
    isTestData: true,
    _count: { select: { users: true, students: true } },
} satisfies Prisma.SchoolSelect;

const studentEntitySelect = {
    id: true,
    studentId: true,
    firstName: true,
    lastName: true,
    nationalId: true,
    gender: true,
    age: true,
    class: true,
    status: true,
    statusChangedAt: true,
    disabledAt: true,
    isTestData: true,
    schoolId: true,
    school: {
        select: {
            name: true,
            disabledAt: true,
            isTestData: true,
        },
    },
} satisfies Prisma.StudentSelect;

function getSchoolForEdit(id: string) {
    return prisma.school.findUnique({
        where: { id },
        select: schoolEntitySelect,
    });
}

function getStudentForEdit(id: string) {
    return prisma.student.findUnique({
        where: { id },
        select: studentEntitySelect,
    });
}

function toSchoolEntityResult(school: SchoolForEdit): SchoolEntityResult {
    return {
        type: "school",
        id: school.id,
        name: school.name,
        province: school.province,
        disabledAt: school.disabledAt,
        isTestData: school.isTestData,
        userCount: school._count.users,
        studentCount: school._count.students,
    };
}

function toStudentEntityResult(student: StudentForEdit): StudentEntityResult {
    return {
        type: "student",
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        nationalIdMasked: maskNationalId(student.nationalId),
        nationalId: student.nationalId,
        gender: student.gender,
        age: student.age,
        class: student.class,
        status: student.status,
        disabledAt: student.disabledAt,
        isTestData: student.isTestData,
        schoolId: student.schoolId,
        schoolName: student.school.name,
        schoolDisabledAt: student.school.disabledAt,
        schoolIsTestData: student.school.isTestData,
    };
}

function getSchoolChanges(
    school: SchoolForEdit,
    input: SystemSchoolEditInput,
): SystemAdminEditChange[] {
    return [
        createChange("name", "ชื่อโรงเรียน", school.name, input.name),
        createChange("province", "จังหวัด", school.province, input.province || null),
    ].filter((change): change is SystemAdminEditChange => change !== null);
}

interface NormalizedStudentInput {
    studentId: string;
    nationalId: string | null;
    firstName: string;
    lastName: string;
    gender: "MALE" | "FEMALE" | null;
    age: number | null;
    class: string;
    status: SystemStudentEditInput["status"];
}

function normalizeStudentInput(
    input: SystemStudentEditInput,
): NormalizedStudentInput {
    return {
        studentId: input.studentId,
        nationalId: input.nationalId || null,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender || null,
        age: input.age === "" || input.age === undefined ? null : input.age,
        class: input.class,
        status: input.status,
    };
}

function getStudentChanges(
    student: StudentForEdit,
    input: NormalizedStudentInput,
): SystemAdminEditChange[] {
    return [
        createChange("studentId", "รหัสนักเรียน", student.studentId, input.studentId),
        createChange("nationalId", "เลขบัตรประชาชน", student.nationalId, input.nationalId),
        createChange("firstName", "ชื่อ", student.firstName, input.firstName),
        createChange("lastName", "นามสกุล", student.lastName, input.lastName),
        createChange("gender", "เพศ", student.gender, input.gender),
        createChange("age", "อายุ", student.age, input.age),
        createChange("class", "ห้อง", student.class, input.class),
        createChange("status", "สถานะนักเรียน", student.status, input.status),
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

function maskNationalId(nationalId: string | null): string | null {
    if (!nationalId) return null;
    return `*********${nationalId.slice(-4)}`;
}

function isUniqueConstraintError(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}
