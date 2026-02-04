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
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-linear-to-r from-pink-500 to-purple-500 px-6 py-4">
                <h2 className="text-lg font-bold text-white">
                    บันทึกการให้คำปรึกษารายบุคคล
                </h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {sessions.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-4xl">📝</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            ยังไม่มีบันทึกการให้คำปรึกษา
                        </h3>
                        <p className="text-gray-500 mb-6">
                            เริ่มต้นบันทึกการให้คำปรึกษาเพื่อติดตามความคืบหน้า
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                    ครั้งที่
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                    วันที่
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                    ชื่อ-นามสกุล
                                </th>
                                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                    สรุปประเด็นที่พูดคุย
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sessions.map((session) => (
                                <tr
                                    key={session.id}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {session.sessionNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {formatDate(session.sessionDate)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
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
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-bold shadow-md hover:shadow-lg flex items-center gap-2"
                >
                    <span>➕</span>
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
