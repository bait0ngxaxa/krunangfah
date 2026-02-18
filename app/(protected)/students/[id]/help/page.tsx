import { notFound, redirect } from "next/navigation";
import { getStudentDetail } from "@/lib/actions/student";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import {
    getColorConfig,
    getActivities,
} from "@/lib/config/help-page-config";
import { ConversationView, ActivityView } from "@/components/student";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ phqResultId?: string }>;
}

export default async function StudentHelpPage({ params, searchParams }: PageProps) {
    const { id: studentId } = await params;
    const { phqResultId } = await searchParams;

    const student = await getStudentDetail(studentId);

    if (!student) {
        notFound();
    }

    const latestResult = phqResultId
        ? student.phqResults.find((r) => r.id === phqResultId) ?? student.phqResults[0]
        : student.phqResults[0];
    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel as RiskLevel;
    const config = getColorConfig(riskLevel);
    const studentName = `${student.firstName} ${student.lastName}`;

    // Red - 3-step workflow, Blue - conversation guidelines only
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

    // Orange, Yellow, Green - Always show worksheet introduction
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
