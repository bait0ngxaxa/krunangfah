import { getStudentDetail } from "@/lib/actions/student.actions";
import { redirect, notFound } from "next/navigation";
import { EncouragementPage } from "@/components/activity";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ type?: string; activity?: string }>;
}

export default async function EncouragementRoute({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const { type: problemType, activity: activityParam } = await searchParams;

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

    // Validate problem type
    const validProblemType =
        problemType === "external" ? "external" : "internal";

    // Get activity number (default to 1)
    const activityNumber = activityParam ? parseInt(activityParam) : 1;

    return (
        <EncouragementPage
            studentId={studentId}
            studentName={`${student.firstName} ${student.lastName}`}
            problemType={validProblemType}
            riskLevel={riskLevel as "orange" | "yellow" | "green"}
            activityNumber={activityNumber}
        />
    );
}
