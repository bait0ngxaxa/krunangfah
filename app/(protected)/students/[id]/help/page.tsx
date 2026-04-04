import { notFound, redirect } from "next/navigation";
import { getStudentDetail } from "@/lib/actions/student/main";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import { getColorConfig, getActivities } from "@/lib/config/help-page-config";
import { ConversationView } from "@/components/student/help/ConversationView";
import { ActivityView } from "@/components/student/help/ActivityView";
import { requireAuth } from "@/lib/session";

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
        redirect(`/students/${studentId}`);
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
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel as RiskLevel;
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
                    phqResultId: latestResult.id,
                    initialReferralStatus: latestResult.referredToHospital,
                    initialHospitalName: latestResult.hospitalName ?? undefined,
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
            phqResultId={latestResult.id}
        />
    );
}
