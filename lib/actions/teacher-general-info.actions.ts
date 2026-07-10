"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateDashboardCache } from "@/lib/actions/dashboard/cache";
import { requireAuth } from "@/lib/auth/session";
import { RATE_LIMIT_TEACHER_GENERAL_INFO_UPDATE } from "@/lib/constants/rate-limit";
import { prisma } from "@/lib/database/prisma";
import {
    createRateLimiter,
    extractRateLimitKey,
    TRUSTED_PROXY_HEADERS,
} from "@/lib/rate-limit";
import { createRateLimitErrorPayload } from "@/lib/rate-limit/errors";
import {
    teacherGeneralInfoSchema,
    type TeacherGeneralInfoData,
} from "@/lib/validations/teacher.validation";
import type {
    TeacherGeneralInfo,
    TeacherGeneralInfoActionResponse,
} from "@/types/teacher.types";
import { handleActionError } from "./error-handler";

const teacherGeneralInfoUpdateLimiter = createRateLimiter(
    RATE_LIMIT_TEACHER_GENERAL_INFO_UPDATE,
);

const teacherGeneralInfoSelect = {
    firstName: true,
    lastName: true,
    age: true,
    schoolRole: true,
    projectRole: true,
} as const;

export async function getMyTeacherGeneralInfo(): Promise<TeacherGeneralInfo | null> {
    const session = await requireAuth();

    return prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: teacherGeneralInfoSelect,
    });
}

export async function updateMyTeacherGeneralInfo(
    input: unknown,
): Promise<TeacherGeneralInfoActionResponse> {
    try {
        const rateLimitResult = await checkRateLimit();
        if (!rateLimitResult.allowed) {
            return {
                success: false,
                message: createRateLimitErrorPayload(rateLimitResult).message,
            };
        }

        const parsed = teacherGeneralInfoSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, message: parsed.error.issues[0].message };
        }

        const session = await requireAuth();
        const teacher = await prisma.teacher.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        });
        if (!teacher) {
            return { success: false, message: "ไม่พบโปรไฟล์ครูของคุณ" };
        }

        const profile = await updateTeacherGeneralInfo(
            session.user.id,
            parsed.data,
        );
        revalidateDashboardCache();
        revalidatePath("/settings");

        return {
            success: true,
            message: "บันทึกข้อมูลทั่วไปสำเร็จ",
            data: profile,
        };
    } catch (error) {
        return handleActionError({
            context: "updateMyTeacherGeneralInfo error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถบันทึกข้อมูลทั่วไปได้ กรุณาลองใหม่อีกครั้ง",
            },
        });
    }
}

async function checkRateLimit() {
    const headerStore = await headers();
    const requestKey = extractRateLimitKey(
        (name) => headerStore.get(name),
        TRUSTED_PROXY_HEADERS,
    );

    return teacherGeneralInfoUpdateLimiter.check(requestKey);
}

async function updateTeacherGeneralInfo(
    userId: string,
    input: TeacherGeneralInfoData,
): Promise<TeacherGeneralInfo> {
    return prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { name: `${input.firstName} ${input.lastName}` },
        });

        return tx.teacher.update({
            where: { userId },
            data: input,
            select: teacherGeneralInfoSelect,
        });
    });
}
