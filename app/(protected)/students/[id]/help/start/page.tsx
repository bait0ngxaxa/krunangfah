import { getStudentDetail } from "@/lib/actions/student";
import {
    getActivityProgress,
    initializeActivityProgress,
} from "@/lib/actions/activity";
import { redirect, notFound } from "next/navigation";
import { ActivityWorkspace } from "@/components/activity";

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

    // Parallelize independent fetches
    const [student, initialProgress] = await Promise.all([
        getStudentDetail(studentId),
        phqResultId
            ? getActivityProgress(studentId, phqResultId)
            : Promise.resolve(null),
    ]);

    if (!student) {
        notFound();
    }

    // Use specific PHQ result if provided, otherwise fall back to latest
    const latestResult = phqResultId
        ? (student.phqResults.find((r) => r.id === phqResultId) ??
          student.phqResults[0])
        : student.phqResults[0];

    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel;

    // Only orange/yellow/green have activities
    if (!["orange", "yellow", "green"].includes(riskLevel)) {
        redirect(`/students/${studentId}/help`);
    }

    // Use parallel result if phqResultId matched, otherwise fetch now
    let progressResult =
        initialProgress && phqResultId === latestResult.id
            ? initialProgress
            : await getActivityProgress(studentId, latestResult.id);

    // Auto-initialize if no progress exists
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
