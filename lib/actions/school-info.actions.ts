"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requirePrimaryAdmin } from "@/lib/auth/session";
import { RATE_LIMIT_SCHOOL_INFO_UPDATE } from "@/lib/constants/rate-limit";
import { prisma } from "@/lib/database/prisma";
import {
    createRateLimiter,
    extractRateLimitKey,
    TRUSTED_PROXY_HEADERS,
} from "@/lib/rate-limit";
import { createRateLimitErrorPayload } from "@/lib/rate-limit/errors";
import {
    schoolInfoSchema,
    type SchoolInfoData,
} from "@/lib/validations/school.validation";
import type {
    SchoolInfo,
    SchoolInfoActionResponse,
} from "@/types/school-info.types";
import { revalidateDashboardCache } from "./dashboard/cache";
import { handleActionError } from "./error-handler";

const schoolInfoUpdateLimiter = createRateLimiter(
    RATE_LIMIT_SCHOOL_INFO_UPDATE,
);

export async function getMySchoolInfo(): Promise<SchoolInfo | null> {
    const session = await requirePrimaryAdmin();
    const schoolId = session.user.schoolId;
    if (!schoolId) return null;

    return prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, province: true },
    });
}

export async function updateMySchoolInfo(
    input: SchoolInfoData,
): Promise<SchoolInfoActionResponse> {
    try {
        const headerStore = await headers();
        const requestKey = extractRateLimitKey(
            (name) => headerStore.get(name),
            TRUSTED_PROXY_HEADERS,
        );
        const rateLimitResult = await schoolInfoUpdateLimiter.check(requestKey);
        if (!rateLimitResult.allowed) {
            return {
                success: false,
                message: createRateLimitErrorPayload(rateLimitResult).message,
            };
        }

        const parsed = schoolInfoSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, message: parsed.error.issues[0].message };
        }

        const session = await requirePrimaryAdmin();
        const schoolId = session.user.schoolId;
        if (!schoolId) {
            return { success: false, message: "ไม่พบข้อมูลโรงเรียนของคุณ" };
        }

        const school = await prisma.school.update({
            where: { id: schoolId },
            data: {
                name: parsed.data.name,
                province: parsed.data.province || null,
            },
            select: { id: true, name: true, province: true },
        });

        revalidateDashboardCache();
        revalidatePath("/settings");

        return {
            success: true,
            message: "บันทึกข้อมูลโรงเรียนสำเร็จ",
            data: school,
        };
    } catch (error) {
        return handleActionError({
            context: "updateMySchoolInfo error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถบันทึกข้อมูลโรงเรียนได้ กรุณาลองใหม่อีกครั้ง",
            },
        });
    }
}
