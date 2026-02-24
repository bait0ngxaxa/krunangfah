"use client";

import { useState } from "react";
import { toast } from "sonner";
import { togglePrimaryStatus } from "@/lib/actions/primary-admin.actions";
import type { SchoolAdminItem } from "@/types/primary-admin.types";

interface PrimaryAdminManagerProps {
    initialAdmins: SchoolAdminItem[];
    currentUserId: string;
}

export function PrimaryAdminManager({
    initialAdmins,
    currentUserId,
}: PrimaryAdminManagerProps) {
    const [admins, setAdmins] = useState<SchoolAdminItem[]>(initialAdmins);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    async function handleToggle(targetId: string): Promise<void> {
        setLoadingId(targetId);

        try {
            const result = await togglePrimaryStatus(targetId);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            // Update local state
            setAdmins((prev) =>
                prev.map((admin) =>
                    admin.id === targetId
                        ? { ...admin, isPrimary: !admin.isPrimary }
                        : admin,
                ),
            );

            toast.success(result.message);
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoadingId(null);
        }
    }

    if (admins.length <= 1) {
        return (
            <p className="text-sm text-gray-400 text-center py-4">
                ยังไม่มีผู้ดูแลคนอื่นในโรงเรียน
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {admins.map((admin) => {
                const isCurrentUser = admin.id === currentUserId;
                const isLoading = loadingId === admin.id;

                return (
                    <div
                        key={admin.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                    >
                        {/* Admin info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-800 truncate">
                                    {admin.teacherName ?? admin.email}
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
                                onClick={() => handleToggle(admin.id)}
                                disabled={isLoading}
                                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    admin.isPrimary
                                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                }`}
                            >
                                {isLoading
                                    ? "กำลังดำเนินการ..."
                                    : admin.isPrimary
                                      ? "ถอดสิทธิ์"
                                      : "เพิ่มสิทธิ์"}
                            </button>
                        )}
                    </div>
                );
            })}

            <p className="text-xs text-gray-400 pt-1">
                ผู้ดูแลที่มีสิทธิ์ Primary สามารถจัดการห้องเรียน เชิญครู
                และจัดการรายชื่อครูได้
            </p>
        </div>
    );
}
