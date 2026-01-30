import { notFound, redirect } from "next/navigation";
import { getStudentDetail } from "@/lib/actions/student.actions";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import {
    ACTIVITIES,
    ACTIVITY_INDICES,
    COLOR_CONFIG,
} from "@/lib/config/help-page-config";
import { ConversationView } from "@/components/student/help/ConversationView";
import { ActivityView } from "@/components/student/help/ActivityView";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function StudentHelpPage({ params }: PageProps) {
    const { id: studentId } = await params;

    const student = await getStudentDetail(studentId);

    if (!student) {
        notFound();
    }

    const latestResult = student.phqResults[0];
    if (!latestResult) {
        redirect(`/students/${studentId}`);
    }

    const riskLevel = latestResult.riskLevel as RiskLevel;
    const config = COLOR_CONFIG[riskLevel] || COLOR_CONFIG.green;
    const studentName = `${student.firstName} ${student.lastName}`;

    // Red and Blue - Conversation only
    if (riskLevel === "red" || riskLevel === "blue") {
        return (
            <ConversationView
                studentName={studentName}
                studentId={studentId}
                riskLevel={riskLevel}
                config={config}
            />
        );
    }

    // Orange, Yellow, Green - Always show worksheet introduction
    const activityIndices = ACTIVITY_INDICES[riskLevel] || [0, 1, 4];
    const activities = activityIndices.map((index) => ACTIVITIES[index]);

    return (
        <ActivityView
            studentName={studentName}
            studentId={studentId}
            config={config}
            activities={activities}
        />
    );
}
