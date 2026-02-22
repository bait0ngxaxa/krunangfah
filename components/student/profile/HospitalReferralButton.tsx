"use client";

import { useState } from "react";
import { Check, UserCheck } from "lucide-react";

export function HospitalReferralButton() {
    const [isReferred, setIsReferred] = useState(false);

    return (
        <button
            type="button"
            onClick={() => setIsReferred((prev) => !prev)}
            className={`
                px-6 py-3 rounded-xl font-bold transition-all duration-300
                flex items-center gap-3 justify-center
                shadow-md hover:shadow-xl active:scale-95 hover:-translate-y-0.5 border border-white/20 relative overflow-hidden group
                ${
                    isReferred
                        ? "bg-[#34D399] text-white shadow-sm hover:shadow-md hover:bg-emerald-400"
                        : "bg-[#0BD0D9] text-white shadow-sm hover:shadow-md hover:bg-[#09B8C0]"
                }
            `}
        >
            <span>
                {isReferred ? (
                    <Check className="w-5 h-5" />
                ) : (
                    <UserCheck className="w-5 h-5" />
                )}
            </span>
            <span>
                {isReferred ? "ส่งต่อครูนางฟ้าแล้ว" : "ส่งต่อให้ครูนางฟ้าดูแล"}
            </span>
        </button>
    );
}
