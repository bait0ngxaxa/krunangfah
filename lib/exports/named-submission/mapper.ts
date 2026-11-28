import { getRiskChartLabel } from "@/lib/constants/risk-levels";
import { getStudentStatusLabel } from "@/lib/constants/student-status";
import {
    canGenerateActivitiesForAssessmentRound,
    getActivityIndices,
    getActivitySequenceSummary,
} from "@/lib/actions/activity/constants";

import {
    attributeResultClass,
    type AttributedClassSource,
} from "@/lib/utils/class-attribution";

import type { NamedSubmissionRecord, NamedSubmissionRow } from "./types";

export const CLASS_SOURCE_LABELS: Record<AttributedClassSource, string> = {
    assessment: "ตอนประเมิน",
    current_class_fallback: "ห้องปัจจุบัน (ข้อมูลก่อนมีการบันทึกห้อง)",
};

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export function mapNamedSubmissionRecord(
    record: NamedSubmissionRecord,
): NamedSubmissionRow {
    const activityCounts = canGenerateActivitiesForAssessmentRound(
        record.assessmentRound,
    )
        ? {
              requiredActivityCount: getActivityIndices(record.riskLevel).length,
              completedActivityCount: getActivitySequenceSummary(
                  record.riskLevel,
                  record.activityProgress,
              ).completedCount,
          }
        : {
              requiredActivityCount: null,
              completedActivityCount: null,
          };
    const attributedClass = attributeResultClass({
        isCurrentTerm: record.academicYear.isCurrent,
        snapshotClassName: record.className,
        currentClassName: record.student.class,
    });

    return {
        schoolName: record.student.school.name,
        province: record.student.school.province ?? "",
        studentId: record.student.studentId,
        firstName: record.student.firstName,
        lastName: record.student.lastName,
        nationalId: record.student.nationalId ?? "",
        className: attributedClass.className,
        studentStatus: getStudentStatusLabel(record.student.status),
        academicYear: record.academicYear.year,
        semester: record.academicYear.semester,
        assessmentRound: record.assessmentRound,
        assessmentDate: THAI_DATE_FORMATTER.format(record.createdAt),
        totalScore: record.totalScore,
        riskGroup: getRiskChartLabel(record.riskLevel),
        ...activityCounts,
        referralStatus: record.referredToHospital ? "ส่งต่อแล้ว" : "ยังไม่ส่งต่อ",
        classSource: CLASS_SOURCE_LABELS[attributedClass.source],
    };
}
