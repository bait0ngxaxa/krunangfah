"use client";

import { useState } from "react";
import { ArrowRightLeft, Undo2, Loader2 } from "lucide-react";
import { revokeStudentReferral } from "@/lib/actions/referral.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ReferredOutStudent } from "@/types/referral.types";

interface ReferredOutSectionProps {
    students: ReferredOutStudent[];
}

export function ReferredOutSection({ students }: ReferredOutSectionProps) {
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const router = useRouter();

    if (students.length === 0) {
        return null;
    }

    const handleRevoke = async (referralId: string): Promise<void> => {
        setRevokingId(referralId);
        try {
            const result = await revokeStudentReferral({ referralId });
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการเรียกคืน");
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/80 ring-1 ring-slate-900/5 overflow-hidden">
            {/* Top Edge Highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-300/30 to-transparent" />

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-linear-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100 shadow-sm text-violet-600">
                        <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-extrabold text-slate-800 tracking-tight">
                            นักเรียนที่ส่งต่อแล้ว
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            นักเรียนที่คุณส่งต่อให้ครูท่านอื่นดูแล
                        </p>
                    </div>
                </div>
                <span className="bg-violet-50 text-violet-700 text-xs font-bold px-3.5 py-1.5 rounded-full border border-violet-100 shadow-sm">
                    {students.length} คน
                </span>
            </div>

            {/* Student List */}
            <div className="divide-y divide-gray-100/80">
                {students.map((student) => (
                    <div
                        key={student.referralId}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-violet-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm shrink-0">
                                {student.firstName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">
                                    {student.firstName} {student.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {student.class} &middot; ส่งต่อให้{" "}
                                    <span className="font-semibold text-violet-600">
                                        {student.toTeacherName}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleRevoke(student.referralId)}
                            disabled={revokingId === student.referralId}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {revokingId === student.referralId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Undo2 className="w-3.5 h-3.5" />
                            )}
                            เรียกคืน
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
