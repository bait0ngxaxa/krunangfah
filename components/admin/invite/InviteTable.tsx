"use client";

import { useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { InviteRow } from "@/components/admin/invite/InviteRow";
import type { SchoolAdminInvite } from "@/types/school-admin-invite.types";

const PAGE_SIZE = 10;

interface InviteTableProps {
    invites: SchoolAdminInvite[];
    onRevoked: () => void;
}

export function InviteTable({ invites, onRevoked }: InviteTableProps) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(invites.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(page, totalPages);
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    const paginatedInvites = invites.slice(start, start + PAGE_SIZE);

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
                <>
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
                                {paginatedInvites.map((invite) => (
                                    <InviteRow
                                        key={invite.id}
                                        invite={invite}
                                        onRevoked={onRevoked}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 relative z-10">
                            <p className="text-sm text-gray-500">
                                แสดง {start + 1}–
                                {Math.min(start + PAGE_SIZE, invites.length)}{" "}
                                จาก {invites.length} รายการ
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={safeCurrentPage <= 1}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    ก่อนหน้า
                                </button>
                                <span className="text-sm font-bold text-gray-700 px-2">
                                    {safeCurrentPage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={safeCurrentPage >= totalPages}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ถัดไป
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
