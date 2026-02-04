"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />

            <h2 className="text-2xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-sm">💬</span>
                บันทึกการให้คำปรึกษารายบุคคล
            </h2>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-pink-100">
                {sessions.length === 0 ? (
                    <div className="p-12 text-center bg-white/50">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-50 flex items-center justify-center">
                            <span className="text-4xl filter drop-shadow-sm">
                                📝
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                            ยังไม่มีบันทึกการให้คำปรึกษา
                        </h3>
                        <p className="text-gray-500 mb-6 font-medium">
                            เริ่มต้นบันทึกการให้คำปรึกษาเพื่อติดตามความคืบหน้า
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-pink-50">
                        <thead className="bg-pink-50/80">
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
                        <tbody className="bg-white/50 divide-y divide-pink-50">
                            {sessions.map((session) => (
                                <tr
                                    key={session.id}
                                    className="hover:bg-pink-50/30 transition-colors"
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
                    className="px-6 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-pink-100"
                >
                    <span className="text-lg">➕</span>
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
