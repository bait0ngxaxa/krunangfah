"use server";

import { prisma } from "@/lib/database/prisma";
import { requirePrimaryAdmin } from "@/lib/auth/session";
import { handleActionError } from "@/lib/actions/error-handler";
import { onboardingProgressSchema } from "@/lib/validations/onboarding.validation";
import {
    ONBOARDING_PROGRESS_STATUSES,
    type OnboardingActionResponse,
    type OnboardingStatus,
} from "@/types/onboarding.types";

type InProgressStatus = (typeof ONBOARDING_PROGRESS_STATUSES)[number];

function isInProgressStatus(
    status: OnboardingStatus,
): status is InProgressStatus {
    return (ONBOARDING_PROGRESS_STATUSES as readonly string[]).includes(
        status,
    );
}

/**
 * Persist the step currently being edited so a new page load can resume it.
 */
export async function saveOnboardingProgress(
    input: unknown,
): Promise<OnboardingActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
        const parsed = onboardingProgressSchema.safeParse(input);

        if (!parsed.success) {
            return {
                success: false,
                message: "ข้อมูลความคืบหน้า onboarding ไม่ถูกต้อง",
            };
        }

        const updated = await prisma.user.updateMany({
            where: {
                id: session.user.id,
                schoolId: { not: null },
                onboardingStatus: { not: "COMPLETED" },
            },
            data: {
                onboardingStatus: parsed.data.status,
            },
        });

        if (updated.count !== 1) {
            return {
                success: false,
                message: "ไม่สามารถบันทึกความคืบหน้า onboarding ได้",
            };
        }

        return {
            success: true,
            message: "บันทึกความคืบหน้า onboarding สำเร็จ",
        };
    } catch (error) {
        return handleActionError({
            context: "saveOnboardingProgress error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถบันทึกความคืบหน้าได้",
            },
        });
    }
}

/**
 * Mark onboarding complete only after the server confirms the required
 * profile and school records still exist.
 */
export async function completeOnboarding(): Promise<OnboardingActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                onboardingStatus: true,
                teacher: { select: { id: true } },
            },
        });

        if (!user?.teacher || !user.schoolId) {
            return {
                success: false,
                message: "กรุณากรอกข้อมูลโปรไฟล์และโรงเรียนให้ครบก่อน",
            };
        }

        if (user.onboardingStatus === "COMPLETED") {
            return {
                success: true,
                message: "ตั้งค่า onboarding เสร็จสิ้นแล้ว",
            };
        }

        if (!isInProgressStatus(user.onboardingStatus)) {
            return {
                success: false,
                message: "ไม่สามารถเสร็จสิ้น onboarding ในสถานะปัจจุบันได้",
            };
        }

        const completed = await prisma.user.updateMany({
            where: {
                id: session.user.id,
                onboardingStatus: { in: [...ONBOARDING_PROGRESS_STATUSES] },
            },
            data: { onboardingStatus: "COMPLETED" },
        });

        if (completed.count !== 1) {
            return {
                success: false,
                message: "ไม่สามารถบันทึกสถานะ onboarding ได้",
            };
        }

        return {
            success: true,
            message: "ตั้งค่า onboarding เสร็จสิ้นแล้ว",
        };
    } catch (error) {
        return handleActionError({
            context: "completeOnboarding error:",
            error,
            fallback: {
                success: false,
                message: "ไม่สามารถเสร็จสิ้น onboarding ได้",
            },
        });
    }
}
