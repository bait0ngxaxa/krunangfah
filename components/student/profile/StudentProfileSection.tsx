"use client";

import { useState } from "react";
import {
    getStudentActionBlockedMessage,
    parseStudentStatusValue,
} from "@/lib/constants/student-status";
import { useStudentStatusContext } from "./StudentStatusContext";
import { HospitalReferralButton } from "@/components/student/referral/HospitalReferralButton";
import { ReferralButton } from "@/components/student/referral/ReferralButton";
import { ReferralHistoryTimeline } from "@/components/student/referral/ReferralHistoryTimeline";
import type { ReferralHistoryRecord } from "@/types/referral.types";
import {
    StudentProfileCard,
    type StudentProfileLatestResult,
    type StudentProfileStudent,
} from "./StudentProfileCard";

interface ReferralData {
    id: string;
    fromTeacherUserId: string;
    toTeacherUserId: string;
    fromTeacher?: {
        teacher: { firstName: string; lastName: string } | null;
    };
    toTeacher?: {
        teacher: { firstName: string; lastName: string } | null;
    };
}

interface StudentProfileSectionProps {
    student: StudentProfileStudent;
    latestResult?: StudentProfileLatestResult | null;
    activePhqResultId?: string;
    canViewNationalId: boolean;
    canEditProfile: boolean;
    canManageLatestCareRecords: boolean;
    currentUserId: string;
    currentUserRole: string;
    referral?: ReferralData | null;
    referralHistory?: ReferralHistoryRecord[];
}

function getBlockedMessage(status?: string | null): string | null {
    const parsedStatus = parseStudentStatusValue(status ?? "ACTIVE");
    if (!parsedStatus) return null;
    return getStudentActionBlockedMessage(parsedStatus);
}

export function StudentProfileSection({
    student,
    latestResult,
    activePhqResultId,
    canViewNationalId,
    canEditProfile,
    canManageLatestCareRecords,
    currentUserId,
    currentUserRole,
    referral,
    referralHistory = [],
}: StudentProfileSectionProps) {
    const [profileStudent, setProfileStudent] = useState(student);
    const studentStatus = useStudentStatusContext();

    const blockedMessage = getBlockedMessage(
        studentStatus?.status ?? profileStudent.status,
    );
    const canShowActionButtons =
        latestResult !== null &&
        latestResult !== undefined &&
        currentUserRole !== "system_admin" &&
        canManageLatestCareRecords &&
        !blockedMessage;

    function handleProfileSaved(updatedStudent: StudentProfileStudent): void {
        const parsedStatus = parseStudentStatusValue(updatedStudent.status);
        setProfileStudent(updatedStudent);
        if (parsedStatus) {
            studentStatus?.setStatus(parsedStatus);
        }
    }

    return (
        <>
            <StudentProfileCard
                key={profileStudent.id}
                student={profileStudent}
                latestResult={latestResult}
                activePhqResultId={activePhqResultId}
                canViewNationalId={canViewNationalId}
                canEditProfile={canEditProfile}
                onProfileSaved={handleProfileSaved}
            />

            {canShowActionButtons && (
                <div className="flex flex-wrap justify-end gap-3">
                    {latestResult.riskLevel === "red" && (
                        <HospitalReferralButton
                            phqResultId={latestResult.id}
                            initialStatus={latestResult.referredToHospital}
                            initialHospitalName={latestResult.hospitalName}
                        />
                    )}
                    <ReferralButton
                        studentId={profileStudent.id}
                        studentName={`${profileStudent.firstName} ${profileStudent.lastName}`}
                        referral={referral}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                    />
                </div>
            )}

            {referralHistory.length > 0 ? (
                <section
                    aria-labelledby="student-referral-history-title"
                    className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                    <div>
                        <h2
                            id="student-referral-history-title"
                            className="text-base font-semibold text-slate-950"
                        >
                            ประวัติการส่งต่อ
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            รายการเรียงจากล่าสุด และไม่สามารถแก้ไขประวัติเดิมได้
                        </p>
                    </div>
                    <ReferralHistoryTimeline records={referralHistory} />
                </section>
            ) : null}
        </>
    );
}
