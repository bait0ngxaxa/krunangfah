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
                px-6 py-3 rounded-2xl font-bold transition-all duration-300
                flex items-center gap-3 justify-center
                shadow-lg hover:shadow-xl active:scale-95 hover:-translate-y-0.5 border border-white/20 relative overflow-hidden group
                ${
                    isReferred
                        ? "bg-linear-to-r from-emerald-400 to-green-500 text-white shadow-green-200 hover:shadow-green-300"
                        : "bg-linear-to-r from-pink-400 to-rose-500 text-white shadow-pink-200 hover:shadow-pink-300"
                }
                disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 disabled:hover:translate-y-0
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
