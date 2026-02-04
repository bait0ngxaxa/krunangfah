"use client";

import { useState, useTransition } from "react";
import { toggleHospitalReferral } from "@/lib/actions/hospital-referral.actions";
import { toast } from "sonner";

interface HospitalReferralButtonProps {
    phqResultId: string;
    initialStatus: boolean;
}

export function HospitalReferralButton({
    phqResultId,
    initialStatus,
}: HospitalReferralButtonProps) {
    const [isReferred, setIsReferred] = useState(initialStatus);
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            const result = await toggleHospitalReferral(phqResultId);

            if (result.success && result.newStatus !== undefined) {
                setIsReferred(result.newStatus);
                toast.success(
                    result.newStatus
                        ? "บันทึกการส่งต่อครูนางฟ้าแล้ว"
                        : "ยกเลิกการส่งต่อแล้ว",
                );
            } else {
                toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
            }
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={`
                px-6 py-3 rounded-xl font-semibold transition-all
                flex items-center gap-2.5 justify-center
                shadow-md hover:shadow-lg active:scale-95
                ${
                    isReferred
                        ? "bg-linear-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                        : "bg-linear-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:active:scale-100
            `}
        >
            {isPending ? (
                <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>กำลังบันทึก...</span>
                </>
            ) : (
                <>
                    <span className="text-lg">{isReferred ? "✓" : "👤"}</span>
                    <span>
                        {isReferred
                            ? "ส่งต่อครูนางฟ้าแล้ว"
                            : "ส่งต่อให้ครูนางฟ้าดูแล"}
                    </span>
                </>
            )}
        </button>
    );
}
