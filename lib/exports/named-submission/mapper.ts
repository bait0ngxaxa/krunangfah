import { getRiskChartLabel } from "@/lib/constants/risk-levels";
import { getStudentStatusLabel } from "@/lib/constants/student-status";

import type { NamedSubmissionRecord, NamedSubmissionRow } from "./types";

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export function mapNamedSubmissionRecord(
    record: NamedSubmissionRecord,
): NamedSubmissionRow {
    return {
        schoolName: record.student.school.name,
        province: record.student.school.province ?? "",
        studentId: record.student.studentId,
        firstName: record.student.firstName,
        lastName: record.student.lastName,
        nationalId: record.student.nationalId ?? "",
        className: record.student.class,
        studentStatus: getStudentStatusLabel(record.student.status),
        academicYear: record.academicYear.year,
        semester: record.academicYear.semester,
        assessmentRound: record.assessmentRound,
        assessmentDate: THAI_DATE_FORMATTER.format(record.createdAt),
        totalScore: record.totalScore,
        riskGroup: getRiskChartLabel(record.riskLevel),
        referralStatus: record.referredToHospital ? "ส่งต่อแล้ว" : "ยังไม่ส่งต่อ",
    };
}
