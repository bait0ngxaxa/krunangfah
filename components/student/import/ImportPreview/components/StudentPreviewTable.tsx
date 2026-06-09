import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { IMPORT_PREVIEW_PAGE_SIZE } from "@/lib/constants/import";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import type { ParsedGender } from "@/lib/utils/excel-parser";
import type { PreviewStudent } from "../types";

interface StudentPreviewTableProps {
    students: PreviewStudent[];
    onRemoveStudent: (studentIndex: number) => void;
    canViewNationalId: boolean;
}

function formatGender(gender: ParsedGender | undefined): string {
    if (gender === "MALE") {
        return "ชาย";
    }

    if (gender === "FEMALE") {
        return "หญิง";
    }

    return "-";
}

export function StudentPreviewTable({
    students,
    onRemoveStudent,
    canViewNationalId,
}: StudentPreviewTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [studentToRemove, setStudentToRemove] = useState<number | null>(null);
    const totalPages = Math.max(
        1,
        Math.ceil(students.length / IMPORT_PREVIEW_PAGE_SIZE),
    );
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStudents = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * IMPORT_PREVIEW_PAGE_SIZE;
        return students.slice(startIndex, startIndex + IMPORT_PREVIEW_PAGE_SIZE);
    }, [safeCurrentPage, students]);

    const pageStart = (safeCurrentPage - 1) * IMPORT_PREVIEW_PAGE_SIZE;
    const studentPendingRemoval =
        studentToRemove === null
            ? null
            : students.find(
                  (student) => student._originalIndex === studentToRemove,
              );

    const handleConfirmRemove = () => {
        if (studentToRemove === null) return;

        onRemoveStudent(studentToRemove);
        setStudentToRemove(null);
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {students.length > 0 && (
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                    <p className="break-words">
                        แสดงข้อมูล {pageStart + 1}-
                        {Math.min(
                            pageStart + IMPORT_PREVIEW_PAGE_SIZE,
                            students.length,
                        )}{" "}
                        จากทั้งหมด {students.length} คน
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setCurrentPage((page) => Math.max(1, page - 1))
                            }
                            disabled={safeCurrentPage === 1}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition-base hover:border-emerald-300 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ก่อนหน้า
                        </button>
                        <span className="min-w-20 text-center font-medium text-gray-700">
                            หน้า {safeCurrentPage}/{totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setCurrentPage((page) =>
                                    Math.min(totalPages, page + 1),
                                )
                            }
                            disabled={safeCurrentPage === totalPages}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition-base hover:border-emerald-300 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}
            {students.length === 0 ? (
                <div className="px-4 py-12 text-center">
                    <p className="text-base font-bold text-gray-800">
                        ไม่มีนักเรียนที่พร้อมนำเข้า
                    </p>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                        รายการทั้งหมดอาจถูกลบออก หรือไม่ผ่านเงื่อนไขห้องเรียน
                        กรุณาตรวจสอบไฟล์หรืออัปโหลดใหม่
                    </p>
                </div>
            ) : (
                <div className="max-h-[600px] overflow-y-auto">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-emerald-100">
                        <thead className="bg-white/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ลำดับ
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    รหัสนักเรียน
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ชื่อ
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    นามสกุล
                                </th>
                                {canViewNationalId && (
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        เลขบัตรประชาชน
                                    </th>
                                )}
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    เพศ
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    อายุ
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ห้อง
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ระดับความเสี่ยง
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50 bg-white/30">
                            {pageStudents.map((student, index) => (
                                <tr
                                    key={student._originalIndex}
                                    className="hover:bg-white/60 transition-colors group"
                                >
                                    <td className="px-4 py-2 text-sm text-gray-500 font-medium">
                                        {pageStart + index + 1}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                        {student.studentId || "-"}
                                    </td>
                                    <td className="max-w-[14rem] break-words px-4 py-2 text-sm font-bold text-gray-800 transition-colors group-hover:text-emerald-600">
                                        {student.firstName || "-"}
                                    </td>
                                    <td className="max-w-[14rem] break-words px-4 py-2 text-sm text-gray-700">
                                        {student.lastName || "-"}
                                    </td>
                                    {canViewNationalId && (
                                        <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                            {student.nationalId || "-"}
                                        </td>
                                    )}
                                    <td className="px-4 py-2 text-sm text-center text-gray-600">
                                        {formatGender(student.gender)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-600">
                                        {student.age ?? "-"}
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-600">
                                        {student.class || "-"}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span
                                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white ${getRiskLevelConfig(student.riskLevel).bgSolid}`}
                                        >
                                            {
                                                getRiskLevelConfig(
                                                    student.riskLevel,
                                                ).label
                                            }
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStudentToRemove(
                                                    student._originalIndex,
                                                )
                                            }
                                            aria-label={`ลบ ${student.firstName || "นักเรียน"} ${student.lastName || ""} ออกจากรายการนำเข้า`}
                                            className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 transition-base hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {studentPendingRemoval && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl">
                        <p className="text-lg font-bold text-gray-800">
                            ลบนักเรียนออกจากรายการนำเข้า?
                        </p>
                        <p className="mt-2 break-words text-sm text-gray-600">
                            {studentPendingRemoval.studentId || "-"} -{" "}
                            {studentPendingRemoval.firstName}{" "}
                            {studentPendingRemoval.lastName} (
                            {studentPendingRemoval.class})
                        </p>
                        <p className="mt-2 text-xs text-red-600">
                            รายการนี้จะถูกลบเฉพาะในพรีวิวก่อนนำเข้า
                            และจะไม่ถูกบันทึกเข้าระบบ
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setStudentToRemove(null)}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-base hover:bg-gray-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRemove}
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-base hover:bg-red-700"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
