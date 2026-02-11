"use client";

import type { WhitelistEntry } from "@/types/whitelist.types";

interface WhitelistEntryRowProps {
    entry: WhitelistEntry;
    isToggling: boolean;
    isDeleting: boolean;
    isConfirmingDelete: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onConfirmDelete: (id: string | null) => void;
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function WhitelistEntryRow({
    entry,
    isToggling,
    isDeleting,
    isConfirmingDelete,
    onToggle,
    onDelete,
    onConfirmDelete,
}: WhitelistEntryRowProps) {
    return (
        <tr className="hover:bg-pink-50/30 transition-colors">
            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                {entry.email}
            </td>

            <td className="px-6 py-4 text-center">
                <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        entry.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                    }`}
                >
                    {entry.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
            </td>

            <td className="px-6 py-4 text-center text-sm text-gray-500 hidden sm:table-cell">
                {formatDate(entry.createdAt)}
            </td>

            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {/* Toggle Button */}
                    <button
                        onClick={() => onToggle(entry.id)}
                        disabled={isToggling}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            entry.isActive
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                        title={entry.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    >
                        {isToggling
                            ? "..."
                            : entry.isActive
                              ? "ปิด"
                              : "เปิด"}
                    </button>

                    {/* Delete Button (with confirm) */}
                    {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onDelete(entry.id)}
                                disabled={isDeleting}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? "..." : "ยืนยัน"}
                            </button>
                            <button
                                onClick={() => onConfirmDelete(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all cursor-pointer"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => onConfirmDelete(entry.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                        >
                            ลบ
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}
