"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import {
    dataManagementActionSchema,
    dataManagementPermanentDeleteSchema,
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
import type { Actor, MutationInput } from "./data-management/mutation-helpers";
import type { PermanentDeleteInput } from "./data-management/permanent-delete";

const EMPTY_SEARCH_RESULT: DataManagementSearchResult = {
    schools: [],
    students: [],
    schoolNextCursor: null,
    studentNextCursor: null,
    schoolHasMore: false,
    studentHasMore: false,
};

type NonPermanentAction = Exclude<
    DataManagementActionInput,
    "permanent-delete"
>;

type ActionCommand =
    | { action: NonPermanentAction; input: MutationInput }
    | { action: "permanent-delete"; input: PermanentDeleteInput };

type ParsedActionCommand =
    | { command: ActionCommand }
    | { message: string };

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

        const actor: Actor = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        };
        const parsedCommand = parseActionCommand(parsedAction.data, input, actor);
        if ("message" in parsedCommand) {
            return { success: false, message: parsedCommand.message };
        }

        const result = await dispatchAction(
            parsedTargetType.data,
            parsedCommand.command,
        );
        if (result.success) {
            revalidatePath(DATA_MANAGEMENT_PATH);
        }
        return result;
    } catch (error) {
        if (isForbiddenError(error)) {
            return { success: false, message: "ไม่มีสิทธิ์ดำเนินการ" };
        }
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

async function dispatchAction(
    targetType: DataManagementTargetInput,
    command: ActionCommand,
): Promise<DataManagementResponse> {
    if (targetType === "school") {
        if (command.action === "permanent-delete") {
            const { permanentlyDeleteSchool } = await import(
                "./data-management/permanent-delete"
            );
            return permanentlyDeleteSchool(command.input);
        }
        return dispatchSchoolAction(command.action, command.input);
    }

    if (command.action === "permanent-delete") {
        const { permanentlyDeleteStudent } = await import(
            "./data-management/permanent-delete"
        );
        return permanentlyDeleteStudent(command.input);
    }
    return dispatchStudentAction(command.action, command.input);
}

function dispatchSchoolAction(
    action: NonPermanentAction,
    input: MutationInput,
): Promise<DataManagementResponse> {
    switch (action) {
        case "mark-test":
            return markSchoolAsTestData(input);
        case "unmark-test":
            return unmarkSchoolTestData(input);
        case "disable":
            return disableSchool(input);
        case "restore":
            return restoreSchool(input);
        default:
            return assertNever(action);
    }
}

function dispatchStudentAction(
    action: NonPermanentAction,
    input: MutationInput,
): Promise<DataManagementResponse> {
    switch (action) {
        case "mark-test":
            return markStudentAsTestData(input);
        case "unmark-test":
            return unmarkStudentTestData(input);
        case "disable":
            return disableStudent(input);
        case "restore":
            return restoreStudent(input);
        default:
            return assertNever(action);
    }
}

function parseActionCommand(
    action: DataManagementActionInput,
    input: unknown,
    actor: Actor,
): ParsedActionCommand {
    if (action === "permanent-delete") {
        const parsed = dataManagementPermanentDeleteSchema.safeParse(input);
        if (!parsed.success) return { message: getValidationMessage(parsed.error) };
        return {
            command: {
                action,
                input: { ...parsed.data, actor },
            },
        };
    }

    const parsed = dataManagementReasonSchema.safeParse(input);
    if (!parsed.success) return { message: getValidationMessage(parsed.error) };
    return {
        command: {
            action,
            input: { ...parsed.data, actor },
        },
    };
}

function getValidationMessage(error: { issues: { message: string }[] }): string {
    return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
}

function isForbiddenError(error: unknown): boolean {
    return error instanceof Error && error.message.startsWith("Forbidden:");
}

function assertNever(value: never): never {
    throw new Error("Unsupported data management action: " + String(value));
}
