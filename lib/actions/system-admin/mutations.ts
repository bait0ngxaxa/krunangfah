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
import {
    applyStudentClassCountAdjustments,
    calculateStudentContributionAdjustments,
    calculateStudentStatusState,
    getCurrentAcademicYearId,
    type StudentStatusState,
} from "@/lib/actions/student/student-class-count";
import { maskNationalId } from "@/lib/utils/national-id";

export interface Actor {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
}

const STUDENT_UPDATE_CONFLICT_MESSAGE =
    "ข้อมูลนักเรียนถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่";

class StudentUpdateConflictError extends Error {
    constructor() {
        super(STUDENT_UPDATE_CONFLICT_MESSAGE);
        this.name = "StudentUpdateConflictError";
    }
}

type SchoolForEdit = NonNullable<Awaited<ReturnType<typeof getSchoolForEdit>>>;

type SystemStudentMutationResult =
    | { kind: "not-found" }
    | { kind: "no-change" }
    | { kind: "class-not-found" }
    | { kind: "updated"; updated: StudentEntityResult };

interface SystemStudentUpdateContext {
    student: StudentForEdit;
    input: SystemStudentEditInput;
    normalized: NormalizedStudentInput;
    actor: Actor;
}

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
        const updateResult = await tx.school.updateMany({
            where: { id: input.id, updatedAt: input.expectedUpdatedAt },
            data: { name: input.name, province: input.province || null },
        });
        if (updateResult.count !== 1) return null;
        const next = await tx.school.findUnique({
            where: { id: input.id },
            select: schoolEntitySelect,
        });
        if (!next) return null;
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
    if (!updated) {
        return {
            success: false,
            message: "ข้อมูลโรงเรียนถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่",
        };
    }

    revalidateDashboardCache();
    revalidatePath("/admin/system");
    revalidatePath("/admin/data-management");
    return { success: true, message: "แก้ไขโรงเรียนสำเร็จ", updated };
}

export async function updateSystemStudent(
    input: SystemStudentEditInput,
    actor: Actor,
): Promise<SystemEditResponse<StudentEntityResult>> {
    const normalized = normalizeStudentInput(input);

    try {
        const result = await runSystemStudentTransaction(
            input,
            normalized,
            actor,
        );

        if (result.kind === "not-found") {
            return { success: false, message: "ไม่พบนักเรียน" };
        }
        if (result.kind === "no-change") {
            return { success: false, message: "ไม่มีข้อมูลเปลี่ยนแปลง" };
        }
        if (result.kind === "class-not-found") {
            return { success: false, message: "ไม่พบห้องเรียนนี้ในโรงเรียน" };
        }

        const updated = result.updated;
        revalidateStudentsCache(updated.schoolId, updated.id);
        revalidateDashboardCache();
        await revalidateAnalyticsCache(updated.schoolId);
        revalidatePath("/school/classes");
        revalidatePath("/admin/system");
        revalidatePath("/admin/data-management");
        return { success: true, message: "แก้ไขนักเรียนสำเร็จ", updated };
    } catch (error) {
        if (error instanceof StudentUpdateConflictError) {
            return { success: false, message: STUDENT_UPDATE_CONFLICT_MESSAGE };
        }
        const uniqueMessage = getUniqueConstraintMessage(error);
        if (uniqueMessage) {
            return { success: false, message: uniqueMessage };
        }
        throw error;
    }
}

async function runSystemStudentTransaction(
    input: SystemStudentEditInput,
    normalized: NormalizedStudentInput,
    actor: Actor,
): Promise<SystemStudentMutationResult> {
    return prisma.$transaction(async (tx) => {
        const student = await tx.student.findUnique({
            where: { id: input.id },
            select: studentEntitySelect,
        });
        if (!student) return { kind: "not-found" };

        return applySystemStudentUpdate(tx, {
            student,
            input,
            normalized,
            actor,
        });
    });
}

async function applySystemStudentUpdate(
    tx: Prisma.TransactionClient,
    context: SystemStudentUpdateContext,
): Promise<SystemStudentMutationResult> {
    const { student, input, normalized, actor } = context;
    const statusState = calculateStudentStatusState({
        oldStatus: student.status,
        newStatus: normalized.status,
        statusChangedAt: student.statusChangedAt,
        leftAt: student.leftAt,
    });
    const changes = getStudentChanges(student, normalized, statusState);
    if (changes.length === 0) return { kind: "no-change" };
    if (!(await systemStudentClassExists(tx, student.schoolId, normalized.class))) {
        return { kind: "class-not-found" };
    }

    const academicYearId = await getCurrentAcademicYearId(tx);
    const next = await updateStudentAndCounts(tx, context, statusState, academicYearId);
    await createSystemAdminEditEvent({
        tx,
        targetType: "student",
        targetId: student.id,
        targetLabel: `${student.firstName} ${student.lastName}`,
        reason: input.reason,
        actor,
        changes,
    });
    return { kind: "updated", updated: toStudentEntityResult(next) };
}

async function systemStudentClassExists(
    tx: Prisma.TransactionClient,
    schoolId: string,
    className: string,
): Promise<boolean> {
    const schoolClass = await tx.schoolClass.findUnique({
        where: { schoolId_name: { schoolId, name: className } },
        select: { id: true },
    });
    return schoolClass !== null;
}

async function updateStudentAndCounts(
    tx: Prisma.TransactionClient,
    context: SystemStudentUpdateContext,
    statusState: StudentStatusState,
    academicYearId: string | null,
): Promise<StudentForEdit> {
    const { student, normalized } = context;
    const updateResult = await tx.student.updateMany({
        where: {
            id: student.id,
            updatedAt: context.input.expectedUpdatedAt,
        },
        data: {
            studentId: normalized.studentId,
            nationalId: normalized.nationalId,
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            gender: normalized.gender,
            age: normalized.age,
            class: normalized.class,
            status: normalized.status,
            statusChangedAt: statusState.statusChangedAt,
            leftAt: statusState.leftAt,
        },
    });
    if (updateResult.count !== 1) throw new StudentUpdateConflictError();

    const next = await tx.student.findUnique({
        where: { id: student.id },
        select: studentEntitySelect,
    });
    if (!next) throw new StudentUpdateConflictError();
    await applyStudentClassCountAdjustments(tx, {
        schoolId: student.schoolId,
        academicYearId,
        adjustments: calculateStudentContributionAdjustments({
            before: {
                className: student.class,
                status: student.status,
                disabledAt: student.disabledAt,
            },
            after: {
                className: normalized.class,
                status: normalized.status,
                disabledAt: student.disabledAt,
            },
        }),
    });
    return next;
}

const schoolEntitySelect = {
    id: true,
    updatedAt: true,
    name: true,
    province: true,
    disabledAt: true,
    isTestData: true,
    _count: { select: { users: true, students: true } },
} satisfies Prisma.SchoolSelect;

const studentEntitySelect = {
    id: true,
    updatedAt: true,
    studentId: true,
    firstName: true,
    lastName: true,
    nationalId: true,
    gender: true,
    age: true,
    class: true,
    status: true,
    statusChangedAt: true,
    leftAt: true,
    disabledAt: true,
    isTestData: true,
    schoolId: true,
    school: {
        select: {
            name: true,
            disabledAt: true,
            isTestData: true,
            classes: {
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            },
        },
    },
} satisfies Prisma.StudentSelect;

type StudentForEdit = Prisma.StudentGetPayload<{
    select: typeof studentEntitySelect;
}>;

function getSchoolForEdit(id: string) {
    return prisma.school.findUnique({
        where: { id },
        select: schoolEntitySelect,
    });
}

function toSchoolEntityResult(school: SchoolForEdit): SchoolEntityResult {
    return {
        type: "school",
        id: school.id,
        updatedAt: school.updatedAt,
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
        updatedAt: student.updatedAt,
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
        classOptions: student.school.classes,
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
    statusState: StudentStatusState,
): SystemAdminEditChange[] {
    return [
        createChange("studentId", "รหัสนักเรียน", student.studentId, input.studentId),
        createNationalIdChange(student.nationalId, input.nationalId),
        createChange("firstName", "ชื่อ", student.firstName, input.firstName),
        createChange("lastName", "นามสกุล", student.lastName, input.lastName),
        createChange("gender", "เพศ", student.gender, input.gender),
        createChange("age", "อายุ", student.age, input.age),
        createChange("class", "ห้อง", student.class, input.class),
        createChange("status", "สถานะนักเรียน", student.status, input.status),
        createChange(
            "statusChangedAt",
            "เวลาที่เปลี่ยนสถานะ",
            formatAuditDate(student.statusChangedAt),
            formatAuditDate(statusState.statusChangedAt),
        ),
        createChange(
            "leftAt",
            "วันที่ออกจากโรงเรียน",
            formatAuditDate(student.leftAt),
            formatAuditDate(statusState.leftAt),
        ),
    ].filter((change): change is SystemAdminEditChange => change !== null);
}

function formatAuditDate(value: Date | null): string | null {
    return value?.toISOString() ?? null;
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

function createNationalIdChange(
    before: string | null,
    after: string | null,
): SystemAdminEditChange | null {
    if (before === after) return null;
    return {
        field: "nationalId",
        label: "เลขบัตรประชาชน",
        before: maskNationalId(before),
        after: maskNationalId(after),
    };
}

function getUniqueConstraintMessage(error: unknown): string | null {
    if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
    ) {
        return null;
    }

    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target : [target];
    if (fields.includes("nationalId")) {
        return "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว";
    }
    if (fields.includes("studentId") || fields.includes("schoolId")) {
        return "รหัสนักเรียนนี้มีอยู่ในโรงเรียนแล้ว";
    }
    return "รหัสนักเรียนหรือเลขบัตรซ้ำในระบบ";
}
