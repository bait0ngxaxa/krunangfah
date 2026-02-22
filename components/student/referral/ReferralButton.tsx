"use client";

import { useState } from "react";
import { UserCheck, ArrowRightLeft } from "lucide-react";
import { TeacherReferralModal } from "./TeacherReferralModal";
import { useRouter } from "next/navigation";

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
}

export function ReferralButton({
    studentId,
    studentName,
    referral,
    currentUserId,
}: ReferralButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    // If student was referred TO the current user, show badge
    if (referral && referral.toTeacherUserId === currentUserId) {
        const fromName = referral.fromTeacher?.teacher
            ? `${referral.fromTeacher.teacher.firstName} ${referral.fromTeacher.teacher.lastName}`
            : "ครูท่านอื่น";

        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-violet-700">
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-sm font-bold">ได้รับส่งต่อจาก {fromName}</span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 justify-center shadow-sm hover:shadow-md active:scale-95 hover:-translate-y-0.5 border border-white/20 bg-violet-500 text-white hover:bg-violet-600"
                >
                    <UserCheck className="w-4 h-4" />
                    ส่งต่อต่อ
                </button>

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
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="text-sm font-bold">ส่งต่อให้ {toName} แล้ว</span>
            </div>
        );
    }

    // Default: show referral button
    return (
        <>
            <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 justify-center shadow-md hover:shadow-xl active:scale-95 hover:-translate-y-0.5 border border-white/20 relative overflow-hidden group bg-violet-500 text-white hover:bg-violet-600"
            >
                <UserCheck className="w-5 h-5" />
                <span>ส่งต่อให้ครูนางฟ้าดูแล</span>
            </button>

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
