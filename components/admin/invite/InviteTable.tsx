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
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-gray-100 shadow-sm relative overflow-hidden group">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                <ClipboardList className="w-5 h-5 text-[#0BD0D9] stroke-[2.5]" />
                <span className="text-gray-900 font-extrabold">
                    รายการคำเชิญ ({invites.length})
                </span>
            </h2>

            {invites.length === 0 ? (
                <div className="p-12 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 relative z-10">
                    <p className="text-gray-500 font-bold text-lg">
                        ยังไม่มีคำเชิญ
                    </p>
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                        สร้างคำเชิญด้านบนเพื่อเชิญ School Admin
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 relative z-10">
                    <table className="w-full">
                        <thead className="bg-gray-50">
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
                        <tbody className="bg-white divide-y divide-gray-100">
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
