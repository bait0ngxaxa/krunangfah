"use server";

import { requireAdmin } from "@/lib/auth/session";
import {
    getSystemAdminValidationMessage,
    systemCareRecordDeleteSchema,
    systemCounselingEditSchema,
    systemHomeVisitEditSchema,
    systemPhqEditSchema,
    systemReferralEditSchema,
    systemSchoolEditSchema,
    systemSearchSchema,
    systemStudentCareRecordsSchema,
    systemStudentEditSchema,
} from "@/lib/validations/system-admin.validation";
import { handleActionError } from "./error-handler";
import {
    getStudentCareRecords,
    deleteSystemReferral,
    resetSystemActivityProgress,
    resetSystemPhqResult,
    saveSystemCounselingRecord,
    saveSystemHomeVisitRecord,
    saveSystemPhqResult,
    saveSystemReferral,
    softDeleteSystemCareRecord,
} from "./system-admin/care-records";
import { listSystemAdminEditEvents } from "./system-admin/events";
import {
    updateSystemSchool,
    updateSystemStudent,
} from "./system-admin/mutations";
import { searchSystemEntities } from "./system-admin/search";
import type {
    SchoolEntityResult,
    SystemActivityRecord,
    StudentEntityResult,
    SystemCareRecordResponse,
    SystemCounselingRecord,
    SystemAdminEditEventItem,
    SystemEditResponse,
    SystemHomeVisitRecord,
    SystemPhqRecord,
    SystemPhqRollbackResult,
    SystemReferralRecord,
    SystemSearchResult,
} from "./system-admin/types";

const EMPTY_SYSTEM_SEARCH_RESULT: SystemSearchResult = {
    schools: [],
    users: [],
    teachers: [],
    students: [],
};

export async function searchSystemAdminEntities(
    input: unknown,
): Promise<SystemSearchResult> {
    try {
        await requireAdmin();
        const parsed = systemSearchSchema.safeParse(input);
        if (!parsed.success) return EMPTY_SYSTEM_SEARCH_RESULT;
        return searchSystemEntities(parsed.data);
    } catch (error) {
        return handleActionError({
            context: "searchSystemAdminEntities error:",
            error,
            fallback: EMPTY_SYSTEM_SEARCH_RESULT,
        });
    }
}

export async function updateSystemAdminSchool(
    input: unknown,
): Promise<SystemEditResponse<SchoolEntityResult>> {
    try {
        const parsed = systemSchoolEditSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลโรงเรียนไม่ถูกต้อง");
        }

        const session = await requireAdmin();
        return updateSystemSchool(parsed.data, {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        });
    } catch (error) {
        return handleActionError({
            context: "updateSystemAdminSchool error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการแก้ไขโรงเรียน",
            },
        });
    }
}

export async function updateSystemAdminStudent(
    input: unknown,
): Promise<SystemEditResponse<StudentEntityResult>> {
    try {
        const parsed = systemStudentEditSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลนักเรียนไม่ถูกต้อง");
        }

        const session = await requireAdmin();
        return updateSystemStudent(parsed.data, {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        });
    } catch (error) {
        return handleActionError({
            context: "updateSystemAdminStudent error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการแก้ไขนักเรียน",
            },
        });
    }
}

export async function listSystemAdminEvents(): Promise<{
    events: SystemAdminEditEventItem[];
}> {
    try {
        await requireAdmin();
        return { events: await listSystemAdminEditEvents() };
    } catch (error) {
        return handleActionError({
            context: "listSystemAdminEvents error:",
            error,
            fallback: { events: [] },
        });
    }
}

export async function getSystemStudentCareRecords(
    input: unknown,
): Promise<SystemCareRecordResponse | null> {
    try {
        await requireAdmin();
        const parsed = systemStudentCareRecordsSchema.safeParse(input);
        if (!parsed.success) return null;
        return getStudentCareRecords(parsed.data.studentId);
    } catch (error) {
        return handleActionError({
            context: "getSystemStudentCareRecords error:",
            error,
            fallback: null,
        });
    }
}

export async function saveSystemAdminCounseling(
    input: unknown,
): Promise<SystemEditResponse<SystemCounselingRecord>> {
    try {
        const parsed = systemCounselingEditSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลการให้คำปรึกษาไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return saveSystemCounselingRecord(parsed.data, {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        });
    } catch (error) {
        return handleActionError({
            context: "saveSystemAdminCounseling error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการบันทึกการให้คำปรึกษา",
            },
        });
    }
}

export async function saveSystemAdminHomeVisit(
    input: unknown,
): Promise<SystemEditResponse<SystemHomeVisitRecord>> {
    try {
        const parsed = systemHomeVisitEditSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลเยี่ยมบ้านไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return saveSystemHomeVisitRecord(parsed.data, {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        });
    } catch (error) {
        return handleActionError({
            context: "saveSystemAdminHomeVisit error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการบันทึกเยี่ยมบ้าน",
            },
        });
    }
}

export async function saveSystemAdminPhq(
    input: unknown,
): Promise<SystemEditResponse<SystemPhqRecord>> {
    try {
        const parsed = systemPhqEditSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูล PHQ ไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return saveSystemPhqResult(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "saveSystemAdminPhq error:",
            error,
            fallback: { success: false, message: "เกิดข้อผิดพลาดในการบันทึก PHQ" },
        });
    }
}

export async function resetSystemAdminPhq(
    input: unknown,
): Promise<SystemEditResponse<SystemPhqRollbackResult>> {
    try {
        const parsed = systemCareRecordDeleteSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลลบ PHQ ไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return resetSystemPhqResult(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "resetSystemAdminPhq error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการล้างผล PHQ",
            },
        });
    }
}

export async function resetSystemAdminActivity(
    input: unknown,
): Promise<SystemEditResponse<SystemActivityRecord>> {
    try {
        const parsed = systemCareRecordDeleteSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลลบกิจกรรมไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return resetSystemActivityProgress(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "resetSystemAdminActivity error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการล้างผลกิจกรรม",
            },
        });
    }
}

export async function saveSystemAdminReferral(
    input: unknown,
): Promise<SystemEditResponse<SystemReferralRecord>> {
    try {
        const parsed = systemReferralEditSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลการส่งต่อไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return saveSystemReferral(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "saveSystemAdminReferral error:",
            error,
            fallback: { success: false, message: "เกิดข้อผิดพลาดในการบันทึกการส่งต่อ" },
        });
    }
}

export async function deleteSystemAdminCareRecord(
    targetType: "counselingSession" | "homeVisit",
    input: unknown,
): Promise<SystemEditResponse<null>> {
    try {
        const parsed = systemCareRecordDeleteSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลลบรายการไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return softDeleteSystemCareRecord(targetType, parsed.data, {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        });
    } catch (error) {
        return handleActionError({
            context: "deleteSystemAdminCareRecord error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการลบรายการย่อย",
            },
        });
    }
}

export async function deleteSystemAdminReferral(
    input: unknown,
): Promise<SystemEditResponse<null>> {
    try {
        const parsed = systemCareRecordDeleteSchema.safeParse(input);
        if (!parsed.success) {
            return invalidInput(parsed.error, "ข้อมูลลบรายการไม่ถูกต้อง");
        }
        const session = await requireAdmin();
        return deleteSystemReferral(parsed.data, toActor(session));
    } catch (error) {
        return handleActionError({
            context: "deleteSystemAdminReferral error:",
            error,
            fallback: {
                success: false,
                message: "เกิดข้อผิดพลาดในการลบการส่งต่อ",
            },
        });
    }
}

function invalidInput(
    error: Parameters<typeof getSystemAdminValidationMessage>[0],
    fallback: string,
): SystemEditResponse<never> {
    return {
        success: false,
        message: getSystemAdminValidationMessage(error, fallback),
    };
}

function toActor(session: Awaited<ReturnType<typeof requireAdmin>>) {
    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
    };
}
