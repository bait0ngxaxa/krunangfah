"use client";

import { ShieldAlert } from "lucide-react";
import type { AdminListItemProps } from "../types";

export function AdminListItem({
    admin,
    isCurrentUser,
    isLoading,
    isConfirming,
    onToggle,
    onCancelConfirm,
}: AdminListItemProps) {
    const displayName = admin.teacherName ?? admin.email;

    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
                {/* Admin info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">
                            {displayName}
                        </span>
                        {isCurrentUser && (
                            <span className="text-xs px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded-md font-medium">
                                คุณ
                            </span>
                        )}
                        {admin.isPrimary && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md font-medium">
                                Primary
                            </span>
                        )}
                    </div>
                    {admin.teacherName && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                            {admin.email}
                        </p>
                    )}
                </div>

                {/* Toggle button — ไม่ให้ถอด primary ตัวเอง */}
                {!isCurrentUser && (
                    <button
                        type="button"
                        onClick={() => onToggle(admin.id)}
                        disabled={isLoading}
                        className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isConfirming
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : admin.isPrimary
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                    >
                        {isLoading
                            ? "กำลังดำเนินการ..."
                            : isConfirming
                              ? "ยืนยันถอดสิทธิ์"
                              : admin.isPrimary
                                ? "ถอดสิทธิ์"
                                : "เพิ่มสิทธิ์"}
                    </button>
                )}
            </div>

            {/* Confirmation alert */}
            {isConfirming && (
                <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-red-700 space-y-1">
                                <p className="font-bold">
                                    ถอดสิทธิ์ Primary Admin ของ
                                    &quot;{displayName}&quot;?
                                </p>
                                <p className="text-red-600">
                                    ผู้ดูแลคนนี้จะไม่สามารถจัดการห้องเรียน
                                    เชิญครู
                                    หรือจัดการรายชื่อครูได้อีก
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onCancelConfirm}
                                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-white transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
