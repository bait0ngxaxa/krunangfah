import { getStudentDetail } from "@/lib/actions/student.actions";
import {
    getActivityProgress,
    initializeActivityProgress,
} from "@/lib/actions/activity.actions";
import { redirect, notFound } from "next/navigation";
import { ActivityWorkspace } from "@/components/activity";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ActivityStartPage({ params }: PageProps) {
    const { id: studentId } = await params;

    const student = await getStudentDetail(studentId);

    if (!student) {
        notFound();
    }

    const latestResult = student.phqResults[0];
    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel;

    // Only orange/yellow/green have activities
    if (!["orange", "yellow", "green"].includes(riskLevel)) {
        redirect(`/students/${studentId}/help`);
    }

    // Get or initialize activity progress
    let progressResult = await getActivityProgress(studentId, latestResult.id);

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
        />
    );
}
