import { RISK_LABELS, RISK_BG_CLASSES } from "@/lib/utils/phq-scoring";
import type { PreviewStudent } from "../types";

interface StudentPreviewTableProps {
    students: PreviewStudent[];
}

/**
 * Table displaying student preview data
 */
export function StudentPreviewTable({ students }: StudentPreviewTableProps) {
    return (
        <div className="bg-white/60 backdrop-blur-xl rounded-4xl shadow-2xl overflow-hidden border border-white/60 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-pink-300 to-purple-300" />

            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-pink-100">
                        <thead className="bg-white/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ลำดับ
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ชื่อ - นามสกุล
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    เพศ
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    อายุ
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ห้อง
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    คะแนนรวม
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ระดับความเสี่ยง
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/30 divide-y divide-pink-50">
                            {students.map((student, index) => (
                                <tr
                                    key={index}
                                    className="hover:bg-white/60 transition-colors group"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-800 group-hover:text-pink-600 transition-colors">
                                        {student.firstName} {student.lastName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-600">
                                        {student.gender === "MALE" ? "ชาย" : student.gender === "FEMALE" ? "หญิง" : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-600">
                                        {student.age ?? "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {student.class}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-800 font-semibold bg-white/20">
                                        {student.totalScore}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-flex px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-md ${RISK_BG_CLASSES[student.riskLevel]}`}
                                        >
                                            {RISK_LABELS[student.riskLevel]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
