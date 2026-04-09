"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, FileText, Plus } from "lucide-react";
import type { CounselingSession } from "@/lib/actions/counseling.actions";
import type { OffsetPagination } from "@/types/pagination.types";
import { AddCounselingModal } from "./AddCounselingModal";
import { Button } from "@/components/ui/Button";
import { QueryPagination } from "@/components/ui/QueryPagination";

interface CounselingLogTableProps {
    sessions: CounselingSession[];
    pagination: OffsetPagination;
    studentId: string;
    readOnly?: boolean;
}

export function CounselingLogTable({
    sessions,
    pagination,
    studentId,
    readOnly = false,
}: CounselingLogTableProps) {
    const router = useRouter();
    const [showAddModal, setShowAddModal] = useState(false);

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const handleSuccess = () => {
        router.refresh();
    };

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm transition-base duration-300 hover:shadow-md md:p-8">
            {/* Corner decoration */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-100/45 blur-3xl" />

            <h2 className="relative text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600 shadow-sm">
                    <MessageCircle className="w-5 h-5" />
                </span>
                <span className="text-gray-800">
                    บันทึกการให้คำปรึกษารายบุคคล
                </span>
            </h2>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                {sessions.length === 0 ? (
                    <div className="p-6 sm:p-12 text-center bg-white/50">
                        <div className="mx-auto mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                            ยังไม่มีบันทึกการให้คำปรึกษา
                        </h3>
                        <p className="text-gray-500 mb-6 font-medium">
                            เริ่มต้นบันทึกการให้คำปรึกษาเพื่อติดตามความคืบหน้า
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-slate-50/90">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                    ครั้งที่
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                    วันที่
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                    ชื่อ-นามสกุล
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                                    สรุปประเด็นที่พูดคุย
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/50 divide-y divide-gray-100">
                            {sessions.map((session) => (
                                <tr
                                    key={session.id}
                                    className="transition-colors hover:bg-slate-50/80"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {session.sessionNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDate(session.sessionDate)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                        {session.counselorName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        <div className="max-w-2xl">
                                            {session.summary}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <QueryPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                pageParam="counselingPage"
            />

            {/* Add Button — ซ่อนเมื่อ readOnly */}
            {!readOnly && (
                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="primary"
                        size="lg"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มบันทึกการให้คำปรึกษา
                    </Button>
                </div>
            )}

            {/* Add Modal */}
            {!readOnly && showAddModal && (
                <AddCounselingModal
                    studentId={studentId}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
