/**
 * Hospital Referral Actions
 * Update referredToHospital status and hospitalName for PHQ results
 *
 * Access control:
 * - system_admin: ใช้ audited correction flow เท่านั้น
 * - school_admin: update ได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: update ได้เฉพาะนักเรียนในห้องที่ดูแล (advisoryClass)
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { updateHospitalReferralSchema } from "@/lib/validations/hospital-referral.validation";
import { revalidateAnalyticsCache } from "@/lib/actions/analytics/cache";
import { revalidateStudentsCache } from "@/lib/actions/student/cache";
import { handleActionError } from "./error-handler";
import { getStudentActionBlockedMessage } from "@/lib/constants/student-status";
import {
    canReferPhqToHospital,
    isPhqScores,
} from "@/lib/utils/phq-scoring";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import {
    canMutatePhqContext,
    LATEST_CARE_RECORD_ONLY_MESSAGE,
} from "@/lib/actions/care-record-current-policy";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";

interface UpdateHospitalReferralParams {
    phqResultId: string;
    referredToHospital: boolean;
    hospitalName?: string;
}

interface UpdateHospitalReferralResult {
    success: boolean;
    error?: string;
    referredToHospital?: boolean;
}

export async function updateHospitalReferral(
    params: UpdateHospitalReferralParams,
): Promise<UpdateHospitalReferralResult> {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const userRole = session.user.role;
        if (userRole === "system_admin") {
            return {
                success: false,
                error: ERROR_MESSAGES.role.systemAdminReadonly(
                    "แก้ไขการส่งต่อโรงพยาบาลผ่านช่องทางปกติ",
                ),
            };
        }

        const validated = updateHospitalReferralSchema.parse(params);
        const result = await runSerializableTransaction(async (tx) => {
            const [phqResult, user] = await Promise.all([
                tx.phqResult.findUnique({
                    where: { id: validated.phqResultId },
                    select: {
                        studentId: true,
                        q1: true,
                        q2: true,
                        q3: true,
                        q4: true,
                        q5: true,
                        q6: true,
                        q7: true,
                        q8: true,
                        q9: true,
                        q9a: true,
                        q9b: true,
                        student: {
                            select: {
                                class: true,
                                schoolId: true,
                                status: true,
                            },
                        },
                    },
                }),
                tx.user.findUnique({
                    where: { id: userId },
                    select: {
                        schoolId: true,
                        teacher: {
                            select: { advisoryClass: true },
                        },
                    },
                }),
            ]);

            if (!phqResult) {
                return { kind: "not-found" } as const;
            }

            if (
                !user?.schoolId ||
                user.schoolId !== phqResult.student.schoolId
            ) {
                return { kind: "forbidden" } as const;
            }

            if (userRole === "class_teacher") {
                const advisoryClass = user.teacher?.advisoryClass;
                const isInAdvisoryClass = advisoryClass && phqResult.student.class === advisoryClass;

                if (!isInAdvisoryClass) {
                    return { kind: "outside-class" } as const;
                }
            }

            const statusError = getStudentActionBlockedMessage(
                phqResult.student.status,
            );
            if (statusError) {
                return { kind: "blocked-status", error: statusError } as const;
            }

            if (
                validated.referredToHospital &&
                (!isPhqScores(phqResult) ||
                    !canReferPhqToHospital(phqResult))
            ) {
                return { kind: "ineligible" } as const;
            }

            const isLatest = await canMutatePhqContext(
                phqResult.studentId,
                validated.phqResultId,
                tx,
            );
            if (!isLatest) {
                return { kind: "historical" } as const;
            }

            await tx.phqResult.update({
                where: { id: validated.phqResultId },
                data: {
                    referredToHospital: validated.referredToHospital,
                    hospitalName: validated.referredToHospital
                        ? (validated.hospitalName?.trim() ?? null)
                        : null,
                },
            });

            return {
                kind: "updated",
                studentId: phqResult.studentId,
                schoolId: phqResult.student.schoolId,
            } as const;
        });

        if (result.kind === "not-found") {
            return { success: false, error: "ไม่พบข้อมูลผลประเมิน" };
        }
        if (result.kind === "forbidden") {
            return { success: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
        }
        if (result.kind === "outside-class") {
            return {
                success: false,
                error: "คุณสามารถแก้ไขข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
            };
        }
        if (result.kind === "blocked-status") {
            return { success: false, error: result.error };
        }
        if (result.kind === "ineligible") {
            return {
                success: false,
                error: "ส่งต่อโรงพยาบาลได้เฉพาะ PHQ สีแดง (เสี่ยงสูงมาก)",
            };
        }
        if (result.kind === "historical") {
            return { success: false, error: LATEST_CARE_RECORD_ONLY_MESSAGE };
        }

        revalidatePath(`/students/${result.studentId}`);
        revalidateStudentsCache(result.schoolId, result.studentId);
        await revalidateAnalyticsCache(result.schoolId);

        return {
            success: true,
            referredToHospital: validated.referredToHospital,
        };
    } catch (error) {
        return handleActionError({
            context: "Error updating hospital referral:",
            error,
            fallback: {
                success: false,
                error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ",
            },
        });
    }
}
