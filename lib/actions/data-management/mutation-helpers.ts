import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/prisma";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import {
    DATA_MANAGEMENT_PATH,
    createActorSnapshot,
} from "./helpers";
import type { DataManagementResponse } from "./types";

export interface Actor {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
}

export interface MutationInput {
    id: string;
    reason: string;
    actor: Actor;
}

type Tx = Prisma.TransactionClient;

export type SchoolForUpdate = NonNullable<
    Awaited<ReturnType<typeof getSchoolForUpdate>>
>;
export type StudentForUpdate = NonNullable<
    Awaited<ReturnType<typeof getStudentForUpdate>>
>;

export function success(message: string): DataManagementResponse {
    return { success: true, message };
}

export function failure(message: string): DataManagementResponse {
    return { success: false, message };
}

export function notFound(message: string): DataManagementResponse {
    return { success: false, message };
}

export async function getSchoolForUpdate(
    tx: Tx,
    id: string,
): Promise<{
    id: string;
    name: string;
    province: string | null;
    disabledAt: Date | null;
    isTestData: boolean;
} | null> {
    return tx.school.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            province: true,
            disabledAt: true,
            isTestData: true,
        },
    });
}

export async function getStudentForUpdate(tx: Tx, id: string) {
    return tx.student.findUnique({
        where: { id },
        include: {
            school: {
                select: {
                    id: true,
                    name: true,
                    isTestData: true,
                    disabledAt: true,
                },
            },
        },
    });
}

export async function getSchoolUserIds(
    tx: Tx,
    schoolId: string,
): Promise<string[]> {
    const users = await tx.user.findMany({
        where: { schoolId },
        select: { id: true },
    });
    return users.map((user) => user.id);
}

export function schoolSnapshot(
    school: SchoolForUpdate,
): Prisma.InputJsonObject {
    return {
        id: school.id,
        label: school.name,
        name: school.name,
        province: school.province,
    };
}

export function studentSnapshot(
    student: StudentForUpdate,
): Prisma.InputJsonObject {
    return {
        id: student.id,
        label: `${student.firstName} ${student.lastName} (${student.studentId})`,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        schoolId: student.schoolId,
        schoolName: student.school.name,
    };
}

interface CreateEventInput {
    input: MutationInput;
    targetType: "school" | "student";
    action: Prisma.DataManagementEventCreateInput["action"];
    targetId: string;
    targetSnapshot: Prisma.InputJsonObject;
    impactSnapshot: Prisma.InputJsonObject;
}

export async function createEvent(
    tx: Tx,
    event: CreateEventInput,
): Promise<string> {
    const created = await tx.dataManagementEvent.create({
        data: {
            targetType: event.targetType,
            targetId: event.targetId,
            action: event.action,
            reason: event.input.reason,
            actorUserId: event.input.actor.id,
            actorSnapshot: createActorSnapshot(event.input.actor),
            targetSnapshot: event.targetSnapshot,
            impactSnapshot: event.impactSnapshot,
        },
        select: { id: true },
    });
    return created.id;
}

export async function revalidateAfterSchool(schoolId: string): Promise<void> {
    revalidateDashboardCache();
    revalidateStudentsCache(schoolId);
    await revalidateAnalyticsCache(schoolId);
    revalidatePath(DATA_MANAGEMENT_PATH);
    revalidatePath("/admin/users");
}

export async function revalidateAfterStudent(studentId: string): Promise<void> {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { schoolId: true },
    });
    revalidateDashboardCache();
    revalidateStudentsCache(student?.schoolId, studentId);
    await revalidateAnalyticsCache(student?.schoolId);
    revalidatePath(DATA_MANAGEMENT_PATH);
}
