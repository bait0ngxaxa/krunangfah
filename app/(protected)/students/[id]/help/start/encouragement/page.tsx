import { getStudentDetail } from "@/lib/actions/student/main";
import { redirect, notFound } from "next/navigation";
import { EncouragementPage } from "@/components/activity/EncouragementPage";
import { requireAuth } from "@/lib/session";
import { studentHelpRoute, studentRoute } from "@/lib/constants/student-routes";
import {
    getLatestPhqResult,
    getRequestedOrLatestPhqResult,
} from "@/lib/utils/phq-result-selection";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        type?: string;
        activity?: string;
        phqResultId?: string;
    }>;
}

export default async function EncouragementRoute({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const {
        type: problemType,
        activity: activityParam,
        phqResultId,
    } = await searchParams;

    // Encouragement flow is teacher-facing; system_admin is read-only.
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

    const riskLevel = latestResult.riskLevel;

    // Encouragement step exists only for orange/yellow/green.
    if (!["orange", "yellow", "green"].includes(riskLevel)) {
        redirect(studentHelpRoute(studentId));
    }

    // Fallback to internal when query is missing/invalid.
    const validProblemType =
        problemType === "external" ? "external" : "internal";

    // Default activity number to 1 when query is missing.
    const activityNumber = activityParam ? parseInt(activityParam) : 1;

    // Include period label for completion summary card.
    const academicYear = latestResult.academicYear;
    const assessmentPeriodLabel = academicYear
        ? `ปีการศึกษา ${academicYear.year} เทอม ${academicYear.semester} ครั้งที่ ${latestResult.assessmentRound}`
        : undefined;

    return (
        <EncouragementPage
            studentId={studentId}
            studentName={`${student.firstName} ${student.lastName}`}
            problemType={validProblemType}
            riskLevel={riskLevel as "orange" | "yellow" | "green"}
            activityNumber={activityNumber}
            assessmentPeriodLabel={assessmentPeriodLabel}
        />
    );
}
