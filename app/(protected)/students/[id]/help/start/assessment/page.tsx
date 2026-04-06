import { getStudentDetail } from "@/lib/actions/student/main";
import { getActivityProgress } from "@/lib/actions/activity";
import { redirect, notFound } from "next/navigation";
import { TeacherAssessmentForm } from "@/components/activity/TeacherAssessmentForm";
import { requireAuth } from "@/lib/session";
import { ACTIVITIES } from "@/lib/config/help-page-config";
import {
    studentHelpEncouragementRoute,
    studentHelpRoute,
    studentHelpStartRoute,
    studentRoute,
} from "@/lib/constants/student-routes";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ activity?: string; phqResultId?: string }>;
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

    const latestResult = phqResultId
        ? (student.phqResults.find((r) => r.id === phqResultId) ??
          student.phqResults[0])
        : student.phqResults[0];

    if (!latestResult) {
        redirect(studentRoute(studentId));
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
    const activityProgress = progressResult.success
        ? progressResult.data || []
        : [];

    // Prefer explicit activity param; fallback to the next assessable activity.
    const activityNumber = activityParam ? parseInt(activityParam) : null;
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
