"use client";

import { ClipboardList } from "lucide-react";
import { WhitelistEntryRow } from "@/components/admin/WhitelistEntryRow";
import type { WhitelistEntry } from "@/types/whitelist.types";

interface WhitelistTableProps {
    entries: WhitelistEntry[];
    deletingId: string | null;
    togglingId: string | null;
    confirmDeleteId: string | null;
    currentUserEmail: string;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onConfirmDelete: (id: string | null) => void;
}

export function WhitelistTable({
    entries,
    deletingId,
    togglingId,
    confirmDeleteId,
    currentUserEmail,
    onToggle,
    onDelete,
    onConfirmDelete,
}: WhitelistTableProps) {
    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-rose-500" />
                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                    รายการ Whitelist ({entries.length})
                </span>
            </h2>

            {entries.length === 0 ? (
                <div className="p-12 text-center bg-white/50 rounded-xl border border-pink-50">
                    <p className="text-gray-400 text-lg">
                        ยังไม่มีอีเมลใน whitelist
                    </p>
                    <p className="text-gray-300 text-sm mt-1">
                        เพิ่มอีเมลด้านบนเพื่อเริ่มต้น
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-pink-100">
                    <table className="w-full">
                        <thead className="bg-pink-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                    อีเมล
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                    สถานะ
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 hidden sm:table-cell">
                                    วันที่เพิ่ม
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/50 divide-y divide-pink-50">
                            {entries.map((entry) => (
                                <WhitelistEntryRow
                                    key={entry.id}
                                    entry={entry}
                                    isSelf={entry.email === currentUserEmail}
                                    isToggling={togglingId === entry.id}
                                    isDeleting={deletingId === entry.id}
                                    isConfirmingDelete={
                                        confirmDeleteId === entry.id
                                    }
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                    onConfirmDelete={onConfirmDelete}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
