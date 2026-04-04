import { getStudentDetail } from "@/lib/actions/student/main";
import {
    getActivityProgress,
    initializeActivityProgress,
} from "@/lib/actions/activity";
import { redirect, notFound } from "next/navigation";
import { ActivityWorkspace } from "@/components/activity/ActivityWorkspace/ActivityWorkspace";
import { requireAuth } from "@/lib/session";

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
        redirect(`/students/${studentId}`);
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
    const latestResult = phqResultId
        ? (student.phqResults.find((r) => r.id === phqResultId) ??
          student.phqResults[0])
        : student.phqResults[0];

    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel;

    // Activity flow exists only for orange/yellow/green.
    if (!["orange", "yellow", "green"].includes(riskLevel)) {
        redirect(`/students/${studentId}/help`);
    }

    // Reuse prefetched progress only when it targets selected PHQ result.
    let progressResult =
        initialProgress && phqResultId === latestResult.id
            ? initialProgress
            : await getActivityProgress(studentId, latestResult.id);

    // First access initializes sequence records for this PHQ result.
    if (!progressResult.success || !progressResult.data?.length) {
        await initializeActivityProgress(
            studentId,
            latestResult.id,
            riskLevel as "orange" | "yellow" | "green",
        );
        progressResult = await getActivityProgress(studentId, latestResult.id);
    }

    const activityProgress = progressResult.success
        ? progressResult.data || []
        : [];

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
