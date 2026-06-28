import { notFound, redirect } from "next/navigation";
import { getStudentDetail } from "@/lib/actions/student/main";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getColorConfig, getActivities } from "@/lib/config/help-page-config";
import { ConversationView } from "@/components/student/help/ConversationView";
import { ActivityView } from "@/components/student/help/ActivityView";
import { requireAuth } from "@/lib/auth/session";
import { studentRoute } from "@/lib/constants/student-routes";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
} from "@/lib/utils/phq-result-selection";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { getStudentActionBlockedMessage } from "@/lib/constants/student-status";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ phqResultId?: string }>;
}

export default async function StudentHelpPage({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const { phqResultId } = await searchParams;

    // Help workflow is teacher-facing; system_admin stays on detail page.
    const session = await requireAuth();
    if (session.user.role === "system_admin") {
        redirect(studentRoute(studentId));
    }

    const student = await getStudentDetail(studentId);

    if (!student) {
        notFound();
    }

    const activePhqResult = getLatestPhqResult(student.phqResults);
    const selectedResult = getRequestedOrLatestPhqResult(
        student.phqResults,
        phqResultId,
    );
    if (!selectedResult) {
        redirect(studentRoute(studentId));
    }

    const canManageActivities =
        activePhqResult?.id !== undefined &&
        selectedResult.id === activePhqResult.id;
    const isReferralLockedForClassTeacher =
        session.user.role === "class_teacher" && Boolean(student.referral);
    const statusLockedMessage = getStudentActionBlockedMessage(student.status);
    const canStartActivities =
        canManageActivities &&
        !isReferralLockedForClassTeacher &&
        !statusLockedMessage;
    const riskLevel = selectedResult.riskLevel as RiskLevel;
    const config = getColorConfig(riskLevel);
    const studentName = `${student.firstName} ${student.lastName}`;

    // Red/blue use conversation path (no worksheet intro view).
    if (riskLevel === "red" || riskLevel === "blue") {
        return (
            <ConversationView
                studentName={studentName}
                studentId={studentId}
                riskLevel={riskLevel}
                config={config}
                {...(riskLevel === "red" && {
                    phqResultId: selectedResult.id,
                    initialReferralStatus: selectedResult.referredToHospital,
                    initialHospitalName: selectedResult.hospitalName ?? undefined,
                    canRecordActions:
                        canManageActivities && !statusLockedMessage,
                    actionLockedMessage:
                        statusLockedMessage ??
                        "กำลังดูข้อมูลย้อนหลัง จึงบันทึกการช่วยเหลือได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
                })}
            />
        );
    }

    // Orange/yellow/green enter worksheet activity flow.
    const activities = getActivities(riskLevel);

    return (
        <ActivityView
            studentName={studentName}
            studentId={studentId}
            config={config}
            activities={activities}
            phqResultId={selectedResult.id}
            canStartActivities={canStartActivities}
            actionLockedMessage={
                statusLockedMessage ??
                (isReferralLockedForClassTeacher
                    ? ERROR_MESSAGES.activity.classTeacherReferredLocked
                    : canManageActivities
                      ? undefined
                      : "กำลังดูข้อมูลย้อนหลัง จึงเริ่มทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน")
            }
        />
    );
}
