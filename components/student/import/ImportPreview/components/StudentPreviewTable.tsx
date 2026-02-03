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
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ลำดับ
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ชื่อ - นามสกุล
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ห้อง
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    คะแนนรวม
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    ระดับความเสี่ยง
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map((student, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {student.firstName} {student.lastName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {student.class}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center text-gray-900">
                                        {student.totalScore}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white ${RISK_BG_CLASSES[student.riskLevel]}`}
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
