"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, FileText, Plus } from "lucide-react";
import type { CounselingSession } from "@/lib/actions/counseling.actions";
import { AddCounselingModal } from "./AddCounselingModal";

interface CounselingLogTableProps {
    sessions: CounselingSession[];
    studentId: string;
}

export function CounselingLogTable({
    sessions,
    studentId,
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
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 md:p-8 border border-emerald-200 ring-1 ring-emerald-50 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-300 via-teal-300 to-cyan-300" />
            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-emerald-200/45 to-teal-300/35 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-[6px] h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

            <h2 className="relative text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-emerald-500" />
                <span className="bg-linear-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    บันทึกการให้คำปรึกษารายบุคคล
                </span>
            </h2>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
                {sessions.length === 0 ? (
                    <div className="p-12 text-center bg-white/50">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                            <FileText className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                            ยังไม่มีบันทึกการให้คำปรึกษา
                        </h3>
                        <p className="text-gray-500 mb-6 font-medium">
                            เริ่มต้นบันทึกการให้คำปรึกษาเพื่อติดตามความคืบหน้า
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-emerald-50">
                        <thead className="bg-emerald-50/80">
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
                        <tbody className="bg-white/50 divide-y divide-emerald-50">
                            {sessions.map((session) => (
                                <tr
                                    key={session.id}
                                    className="hover:bg-emerald-50/30 transition-colors"
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

            {/* Add Button */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-linear-to-r from-emerald-400 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/50 hover:-translate-y-0.5 transition-all font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-200/50"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มบันทึกการให้คำปรึกษา
                </button>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <AddCounselingModal
                    studentId={studentId}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
