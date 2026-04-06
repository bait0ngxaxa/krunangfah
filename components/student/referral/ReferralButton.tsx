"use client";

import { useState } from "react";
import { UserCheck, ArrowRightLeft } from "lucide-react";
import { TeacherReferralModal } from "./TeacherReferralModal";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

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

interface ReferralButtonProps {
    studentId: string;
    studentName: string;
    referral?: ReferralData | null;
    currentUserId: string;
    currentUserRole: string;
}

export function ReferralButton({
    studentId,
    studentName,
    referral,
    currentUserId,
    currentUserRole,
}: ReferralButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    // If student was referred TO the current user, show badge
    if (
        referral &&
        currentUserRole !== "class_teacher" &&
        referral.toTeacherUserId === currentUserId
    ) {
        const fromName = referral.fromTeacher?.teacher
            ? `${referral.fromTeacher.teacher.firstName} ${referral.fromTeacher.teacher.lastName}`
            : "ครูท่านอื่น";

        return (
            <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-[var(--brand-primary-hover)] shadow-sm">
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-sm font-bold">
                        ได้รับส่งต่อจาก {fromName}
                    </span>
                </div>
                <Button
                    type="button"
                    onClick={() => setShowModal(true)}
                    variant="primary"
                    size="md"
                    className="active:scale-95"
                >
                    <UserCheck className="w-4 h-4" />
                    ส่งต่อต่อ
                </Button>

                {showModal && (
                    <TeacherReferralModal
                        studentId={studentId}
                        studentName={studentName}
                        onClose={() => setShowModal(false)}
                        onSuccess={() => router.refresh()}
                    />
                )}
            </div>
        );
    }

    // If student was referred BY the current user (fromTeacher), show info
    if (referral && referral.fromTeacherUserId === currentUserId) {
        const toName = referral.toTeacher?.teacher
            ? `${referral.toTeacher.teacher.firstName} ${referral.toTeacher.teacher.lastName}`
            : "ครูท่านอื่น";

        return (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700 shadow-sm">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="text-sm font-bold">
                    ส่งต่อให้ {toName} แล้ว
                </span>
            </div>
        );
    }

    // Default: show referral button
    return (
        <>
            <Button
                type="button"
                onClick={() => setShowModal(true)}
                variant="primary"
                size="lg"
                className="active:scale-95"
            >
                <UserCheck className="w-5 h-5" />
                <span>ส่งต่อให้ครูนางฟ้าดูแล</span>
            </Button>

            {showModal && (
                <TeacherReferralModal
                    studentId={studentId}
                    studentName={studentName}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}
