import { getStudentDetail } from "@/lib/actions/student/main";
import {
    getActivityProgress,
    initializeActivityProgress,
} from "@/lib/actions/activity";
import { redirect, notFound } from "next/navigation";
import { ActivityWorkspace } from "@/components/activity/ActivityWorkspace/ActivityWorkspace";
import { ActivitySequenceComplete } from "@/components/activity/ActivitySequenceComplete";
import { requireAuth } from "@/lib/auth/session";
import {
    studentHelpRoute,
    studentRoute,
} from "@/lib/constants/student-routes";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
} from "@/lib/utils/phq-result-selection";
import { canStudentPerformActions } from "@/lib/constants/student-status";
import { getActivitySequenceSummary } from "@/lib/actions/activity/constants";
import { formatAcademicYear } from "@/lib/utils/academic-year";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ phqResultId?: string }>;
}

export default async function ActivityStartPage({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const { phqResultId } = await searchParams;

    // Activity workspace is teacher-facing; system_admin is read-only.
    const session = await requireAuth();
    if (session.user.role === "system_admin") {
        redirect(studentRoute(studentId));
    }

    // Fetch detail + optional progress in parallel.
    const [student, initialProgress] = await Promise.all([
        getStudentDetail(studentId),
        phqResultId
            ? getActivityProgress(studentId, phqResultId)
            : Promise.resolve(null),
    ]);

    if (!student) {
        notFound();
    }

    // Use requested PHQ result when present; fallback to latest.
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
    if (!canStudentPerformActions(student.status)) {
        redirect(studentHelpRoute(studentId));
    }

    const riskLevel = latestResult.riskLevel;

    // Activity flow exists only for orange/yellow/green.
    if (!["orange", "yellow", "green"].includes(riskLevel)) {
        redirect(studentHelpRoute(studentId));
    }

    // Reuse prefetched progress only when it targets selected PHQ result.
    let progressResult =
        initialProgress && phqResultId === latestResult.id
            ? initialProgress
            : await getActivityProgress(studentId, latestResult.id);

    if (!progressResult?.success) {
        redirect(studentHelpRoute(studentId));
    }

    // First access initializes sequence records for this PHQ result.
    if (!progressResult.success || !progressResult.data?.length) {
        await initializeActivityProgress(
            studentId,
            latestResult.id,
            riskLevel as "orange" | "yellow" | "green",
        );
        progressResult = await getActivityProgress(studentId, latestResult.id);
        if (!progressResult.success) {
            redirect(studentHelpRoute(studentId));
        }
    }

    const activityProgress = progressResult.success
        ? progressResult.data || []
        : [];
    const activitySummary = getActivitySequenceSummary(
        riskLevel,
        activityProgress,
    );

    if (activitySummary.isComplete) {
        return (
            <ActivitySequenceComplete
                studentId={studentId}
                studentName={`${student.firstName} ${student.lastName}`}
                assessmentPeriodLabel={formatAcademicYear(
                    latestResult.academicYear.year,
                    latestResult.academicYear.semester,
                    "long",
                )}
                completedCount={activitySummary.completedCount}
            />
        );
    }

    return (
        <ActivityWorkspace
            studentId={studentId}
            studentName={`${student.firstName} ${student.lastName}`}
            riskLevel={riskLevel as "orange" | "yellow" | "green"}
            activityProgress={activityProgress}
            phqResultId={latestResult.id}
        />
    );
}
