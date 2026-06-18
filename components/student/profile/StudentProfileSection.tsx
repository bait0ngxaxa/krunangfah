"use client";

import { useState } from "react";
import {
    getStudentActionBlockedMessage,
    parseStudentStatusValue,
} from "@/lib/constants/student-status";
import { HospitalReferralButton } from "@/components/student/referral/HospitalReferralButton";
import { ReferralButton } from "@/components/student/referral/ReferralButton";
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
}: StudentProfileSectionProps) {
    const [profileStudent, setProfileStudent] = useState(student);

    const blockedMessage = getBlockedMessage(profileStudent.status);
    const canShowActionButtons =
        latestResult !== null &&
        latestResult !== undefined &&
        currentUserRole !== "system_admin" &&
        canManageLatestCareRecords &&
        !blockedMessage;

    return (
        <>
            <StudentProfileCard
                key={profileStudent.id}
                student={profileStudent}
                latestResult={latestResult}
                activePhqResultId={activePhqResultId}
                canViewNationalId={canViewNationalId}
                canEditProfile={canEditProfile}
                onProfileSaved={setProfileStudent}
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
        </>
    );
}
