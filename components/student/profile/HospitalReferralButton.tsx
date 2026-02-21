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
                        ? "bg-linear-to-r from-emerald-400 to-green-500 text-white shadow-green-200 hover:shadow-green-300"
                        : "bg-linear-to-r from-teal-400 to-emerald-500 text-white shadow-emerald-200/50 hover:shadow-emerald-300/50"
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
