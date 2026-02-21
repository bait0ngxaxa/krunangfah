"use client";

import { ClipboardList } from "lucide-react";
import { InviteRow } from "@/components/admin/invite/InviteRow";
import type { SchoolAdminInvite } from "@/types/school-admin-invite.types";

interface InviteTableProps {
    invites: SchoolAdminInvite[];
    onRevoked: () => void;
}

export function InviteTable({ invites, onRevoked }: InviteTableProps) {
    return (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-emerald-100/50 p-6 md:p-8 border border-emerald-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
                <span className="bg-linear-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    รายการคำเชิญ ({invites.length})
                </span>
            </h2>

            {invites.length === 0 ? (
                <div className="p-12 text-center bg-white/50 rounded-xl border border-emerald-50">
                    <p className="text-gray-400 text-lg">ยังไม่มีคำเชิญ</p>
                    <p className="text-gray-300 text-sm mt-1">
                        สร้างคำเชิญด้านบนเพื่อเชิญ School Admin
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-emerald-100">
                    <table className="w-full">
                        <thead className="bg-emerald-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                    อีเมล
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                    บทบาท
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                    สถานะ
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 hidden sm:table-cell">
                                    วันที่สร้าง
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 hidden md:table-cell">
                                    หมดอายุ
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/50 divide-y divide-emerald-50">
                            {invites.map((invite) => (
                                <InviteRow
                                    key={invite.id}
                                    invite={invite}
                                    onRevoked={onRevoked}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
