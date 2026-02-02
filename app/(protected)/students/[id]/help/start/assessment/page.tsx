import { getStudentDetail } from "@/lib/actions/student";
import { getActivityProgress } from "@/lib/actions/activity";
import { redirect, notFound } from "next/navigation";
import { TeacherAssessmentForm } from "@/components/activity";

const ACTIVITIES = [
    { id: "a1", number: 1, title: "กิจกรรมที่ 1: รู้จักตัวเอง" },
    { id: "a2", number: 2, title: "กิจกรรมที่ 2: ค้นหาคุณค่าที่ฉันมี" },
    { id: "a3", number: 3, title: "กิจกรรมที่ 3: ปรับความคิด ชีวิตเปลี่ยน" },
    { id: "a4", number: 4, title: "กิจกรรมที่ 4: รู้จักตัวกระตุ้น" },
    { id: "a5", number: 5, title: "กิจกรรมที่ 5: ตามติดเพื่อไปต่อ" },
];

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ activity?: string }>;
}

export default async function TeacherAssessmentPage({
    params,
    searchParams,
}: PageProps) {
    const { id: studentId } = await params;
    const { activity: activityParam } = await searchParams;

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

    // Get activity progress
    const progressResult = await getActivityProgress(
        studentId,
        latestResult.id,
    );
    const activityProgress = progressResult.success
        ? progressResult.data || []
        : [];

    // Find the activity that needs assessment (has uploads but pending assessment)
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
        redirect(`/students/${studentId}/help/start`);
    }

    // Assessment page only for Activity 1
    // Activities 2-5 skip directly to encouragement
    if (currentProgress.activityNumber !== 1) {
        redirect(
            `/students/${studentId}/help/start/encouragement?activity=${currentProgress.activityNumber}`,
        );
    }

    const activity = ACTIVITIES.find(
        (a) => a.number === currentProgress.activityNumber,
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
        />
    );
}
