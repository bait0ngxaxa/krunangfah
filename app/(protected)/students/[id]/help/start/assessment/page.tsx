import { getStudentDetail } from "@/lib/actions/student/main";
import { getActivityProgress } from "@/lib/actions/activity";
import { redirect, notFound } from "next/navigation";
import { TeacherAssessmentForm } from "@/components/activity/TeacherAssessmentForm";
import { requireAuth } from "@/lib/session";
import { ACTIVITIES } from "@/lib/config/help-page-config";
import { getWorksheetActivityIndices } from "@/components/activity/ActivityWorkspace/constants";
import {
    studentHelpEncouragementRoute,
    studentHelpRoute,
    studentHelpStartRoute,
    studentRoute,
} from "@/lib/constants/student-routes";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
} from "@/lib/utils/phq-result-selection";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ activity?: string; phqResultId?: string }>;
}

function parseActivityNumber(activityValue?: string): number | null {
    if (!activityValue) return null;
    const parsed = Number.parseInt(activityValue, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function TeacherAssessmentPage({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const { activity: activityParam, phqResultId } = await searchParams;

    // Assessment flow is teacher-facing; system_admin is read-only.
    const session = await requireAuth();
    if (session.user.role === "system_admin") {
        redirect(studentRoute(studentId));
    }

    const student = await getStudentDetail(studentId);

    if (!student) {
        notFound();
    }

    const activePhqResult = getLatestPhqResult(student.phqResults);
    const latestResult = getRequestedOrLatestPhqResult(
        student.phqResults,
        phqResultId,
    );

    if (!latestResult) {
        redirect(studentRoute(studentId));
    }

    if (activePhqResult?.id !== latestResult.id) {
        redirect(studentHelpRoute(studentId));
    }
    if (session.user.role === "class_teacher" && Boolean(student.referral)) {
        redirect(studentHelpRoute(studentId));
    }

    const riskLevel = latestResult.riskLevel;

    // Assessment flow exists only for orange/yellow/green.
    if (!["orange", "yellow", "green"].includes(riskLevel)) {
        redirect(studentHelpRoute(studentId));
    }

    // Load progress for selected PHQ result.
    const progressResult = await getActivityProgress(
        studentId,
        latestResult.id,
    );
    if (!progressResult.success) {
        redirect(studentHelpRoute(studentId));
    }
    const activityProgress = progressResult.success
        ? progressResult.data || []
        : [];

    // Prefer explicit activity param; fallback to the next assessable activity.
    const activityNumber = parseActivityNumber(activityParam);
    const allowedActivities = getWorksheetActivityIndices(
        riskLevel as "orange" | "yellow" | "green",
    );
    if (activityNumber && !allowedActivities.includes(activityNumber)) {
        redirect(studentHelpStartRoute(studentId, phqResultId));
    }
    const currentProgress = activityNumber
        ? activityProgress.find((p) => p.activityNumber === activityNumber)
        : activityProgress.find(
              (p) =>
                  p.status === "pending_assessment" ||
                  (p.status === "in_progress" &&
                      p.worksheetUploads.length >= 2),
          );

    if (!currentProgress) {
        redirect(studentHelpStartRoute(studentId, phqResultId));
    }

    // Only activity 1 uses this form; later activities go directly to encouragement.
    if (currentProgress.activityNumber !== 1) {
        redirect(
            studentHelpEncouragementRoute(
                studentId,
                currentProgress.activityNumber,
                { phqResultId },
            ),
        );
    }

    const activity = ACTIVITIES.find(
        (a) => a.id === `a${currentProgress.activityNumber}`,
    );

    return (
        <TeacherAssessmentForm
            studentId={studentId}
            studentName={`${student.firstName} ${student.lastName}`}
            activityProgressId={currentProgress.id}
            activityNumber={currentProgress.activityNumber}
            activityTitle={
                activity?.title ||
                `กิจกรรมที่ ${currentProgress.activityNumber}`
            }
            riskLevel={riskLevel as "orange" | "yellow" | "green"}
            phqResultId={phqResultId}
        />
    );
}
