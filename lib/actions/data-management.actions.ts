"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import {
    dataManagementActionSchema,
    dataManagementReasonSchema,
    dataManagementSearchSchema,
    dataManagementTargetSchema,
} from "@/lib/validations/data-management.validation";
import { handleActionError } from "./error-handler";
import { DATA_MANAGEMENT_PATH, toEventItem } from "./data-management/helpers";
import { hasDataManagementSearchIntent } from "./data-management/search-intent";
import {
    getSchoolDataManagementPreview,
    getStudentDataManagementPreview,
} from "./data-management/preview";
import { searchDataManagementTargets } from "./data-management/search";
import {
    disableSchool,
    disableStudent,
    markSchoolAsTestData,
    markStudentAsTestData,
    restoreSchool,
    restoreStudent,
    unmarkSchoolTestData,
    unmarkStudentTestData,
} from "./data-management/mutations";
import {
    permanentlyDeleteSchool,
    permanentlyDeleteStudent,
} from "./data-management/permanent-delete";
import type {
    DataManagementEventListResponse,
    DataManagementResponse,
    DataManagementSearchResult,
    SchoolDataManagementPreview,
    StudentDataManagementPreview,
} from "./data-management/types";
import type {
    DataManagementActionInput,
    DataManagementTargetInput,
} from "@/lib/validations/data-management.validation";

const EMPTY_SEARCH_RESULT: DataManagementSearchResult = {
    schools: [],
    students: [],
    schoolNextCursor: null,
    studentNextCursor: null,
    schoolHasMore: false,
    studentHasMore: false,
};

export async function searchDataManagement(
    input: unknown,
): Promise<DataManagementSearchResult> {
    await requireAdmin();
    const parsed = dataManagementSearchSchema.safeParse(input ?? {});
    if (!parsed.success) return EMPTY_SEARCH_RESULT;
    if (!hasDataManagementSearchIntent(parsed.data)) {
        return EMPTY_SEARCH_RESULT;
    }
    return searchDataManagementTargets(parsed.data);
}

export async function getDataManagementPreview(
    targetType: DataManagementTargetInput,
    targetId: string,
): Promise<SchoolDataManagementPreview | StudentDataManagementPreview | null> {
    await requireAdmin();
    const parsedTargetType = dataManagementTargetSchema.safeParse(targetType);
    if (!parsedTargetType.success) return null;
    if (parsedTargetType.data === "school") {
        return getSchoolDataManagementPreview(targetId);
    }
    return getStudentDataManagementPreview(targetId);
}

export async function runDataManagementAction(
    targetType: DataManagementTargetInput,
    action: DataManagementActionInput,
    input: unknown,
): Promise<DataManagementResponse> {
    try {
        const session = await requireAdmin();
        const parsedTargetType = dataManagementTargetSchema.safeParse(targetType);
        const parsedAction = dataManagementActionSchema.safeParse(action);
        if (!parsedTargetType.success || !parsedAction.success) {
            return {
                success: false,
                message: "คำสั่งจัดการข้อมูลไม่ถูกต้อง",
            };
        }

        const parsed = dataManagementReasonSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
            };
        }

        const mutationInput = {
            ...parsed.data,
            actor: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
            },
        };
        const result = await dispatchAction(
            parsedTargetType.data,
            parsedAction.data,
            mutationInput,
        );
        revalidatePath(DATA_MANAGEMENT_PATH);
        return result;
    } catch (error) {
        return handleActionError({
            context: "runDataManagementAction error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการจัดการข้อมูล",
            },
        });
    }
}

export async function listDataManagementEvents(): Promise<DataManagementEventListResponse> {
    await requireAdmin();
    const events = await prisma.dataManagementEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 80,
    });
    return { events: events.map(toEventItem) };
}

function dispatchAction(
    targetType: DataManagementTargetInput,
    action: DataManagementActionInput,
    input: Parameters<typeof disableSchool>[0],
): Promise<DataManagementResponse> {
    if (targetType === "school") {
        if (action === "mark-test") return markSchoolAsTestData(input);
        if (action === "unmark-test") return unmarkSchoolTestData(input);
        if (action === "disable") return disableSchool(input);
        if (action === "restore") return restoreSchool(input);
        if (action === "permanent-delete") return permanentlyDeleteSchool(input);
        return assertNever(action);
    }

    if (action === "mark-test") return markStudentAsTestData(input);
    if (action === "unmark-test") return unmarkStudentTestData(input);
    if (action === "disable") return disableStudent(input);
    if (action === "restore") return restoreStudent(input);
    if (action === "permanent-delete") return permanentlyDeleteStudent(input);
    return assertNever(action);
}

function assertNever(value: never): never {
    throw new Error(`Unsupported data management action: ${String(value)}`);
}
