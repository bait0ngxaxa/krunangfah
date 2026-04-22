import { useState, useCallback, useMemo } from "react";
import { type PhqScores } from "@/lib/utils/phq-scoring";
import { IMPORT_PREVIEW_PAGE_SIZE } from "@/lib/constants/import";
import { getRiskLevelConfig } from "@/lib/constants/risk-levels";
import type { PreviewStudent } from "../types";

interface StudentPreviewTableProps {
    students: PreviewStudent[];
    onScoreUpdate: (
        studentIndex: number,
        field: keyof PhqScores,
        value: number | boolean,
    ) => void;
}

const SCORE_KEYS = [
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
] as const;

function getScoreValue(
    scores: PhqScores,
    key: (typeof SCORE_KEYS)[number],
): number {
    switch (key) {
        case "q1":
            return scores.q1;
        case "q2":
            return scores.q2;
        case "q3":
            return scores.q3;
        case "q4":
            return scores.q4;
        case "q5":
            return scores.q5;
        case "q6":
            return scores.q6;
        case "q7":
            return scores.q7;
        case "q8":
            return scores.q8;
        case "q9":
            return scores.q9;
    }
}

/**
 * Controlled score input with local editing state.
 * Allows natural typing/backspace, commits on blur or valid digit.
 */
function ScoreInput({
    value,
    onChange,
}: {
    value: number;
    onChange: (val: number) => void;
}) {
    const [localValue, setLocalValue] = useState(String(value));
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            setLocalValue(String(value));
            setIsFocused(true);
            e.target.select();
        },
        [value],
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;

            // Allow empty (user is deleting)
            if (raw === "") {
                setLocalValue("");
                return;
            }

            // Only accept digits, clamp to 0-3
            const lastChar = raw.slice(-1);
            if (/^[0-9]$/.test(lastChar)) {
                const num = Math.min(parseInt(lastChar, 10), 3);
                setLocalValue(String(num));
                onChange(num);
            }
        },
        [onChange],
    );

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // If empty on blur, default to 0
        if (localValue === "") {
            setLocalValue("0");
            onChange(0);
        }
    }, [localValue, onChange]);

    return (
        <input
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={isFocused ? localValue : String(value)}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-10 h-8 text-center text-sm font-mono border border-gray-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-base"
        />
    );
}

/**
 * Table displaying student preview data with editable PHQ scores
 */
export function StudentPreviewTable({
    students,
    onScoreUpdate,
}: StudentPreviewTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
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

    return (
        <div className="bg-white rounded-4xl shadow-sm overflow-hidden border-2 border-gray-100 relative">
            {students.length > 0 && (
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                    <p>
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
                            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition-base hover:border-emerald-300 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 transition-base hover:border-emerald-300 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}
            <div className="max-h-[600px] overflow-y-auto">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-emerald-100">
                        <thead className="bg-white/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ลำดับ
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ชื่อ - นามสกุล
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ห้อง
                                </th>
                                {/* Individual PHQ Scores */}
                                {SCORE_KEYS.map((key) => (
                                    <th
                                        key={key}
                                        className="px-1 py-4 text-center text-xs font-bold text-indigo-500 uppercase tracking-wider"
                                    >
                                        {key}
                                    </th>
                                ))}
                                <th className="px-1 py-4 text-center text-xs font-bold text-rose-500 uppercase tracking-wider">
                                    opt1
                                </th>
                                <th className="px-1 py-4 text-center text-xs font-bold text-rose-500 uppercase tracking-wider">
                                    opt2
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    รวม
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    ระดับความเสี่ยง
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/30 divide-y divide-emerald-50">
                            {pageStudents.map((student, index) => (
                                <tr
                                    key={student._originalIndex}
                                    className="hover:bg-white/60 transition-colors group"
                                >
                                    <td className="px-4 py-2 text-sm text-gray-500 font-medium">
                                        {pageStart + index + 1}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-bold text-gray-800 group-hover:text-emerald-600 transition-colors whitespace-nowrap">
                                        {student.firstName} {student.lastName}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-600">
                                        {student.class}
                                    </td>
                                    {SCORE_KEYS.map((key) => (
                                        <td key={key} className="px-0.5 py-2">
                                            <ScoreInput
                                                value={getScoreValue(
                                                    student.scores,
                                                    key,
                                                )}
                                                onChange={(val) =>
                                                    onScoreUpdate(
                                                        student._originalIndex,
                                                        key,
                                                        val,
                                                    )
                                                }
                                            />
                                        </td>
                                    ))}
                                    {/* Clickable opt1 toggle */}
                                    <td className="px-0.5 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onScoreUpdate(
                                                    student._originalIndex,
                                                    "q9a",
                                                    !student.scores.q9a,
                                                )
                                            }
                                            className={`w-8 h-8 rounded-lg border-2 text-sm font-bold transition-base ${
                                                student.scores.q9a
                                                    ? "bg-red-100 border-red-400 text-red-600"
                                                    : "bg-gray-50 border-gray-200 text-gray-300 hover:border-gray-300"
                                            }`}
                                        >
                                            {student.scores.q9a ? "✓" : "✗"}
                                        </button>
                                    </td>
                                    {/* Clickable opt2 toggle */}
                                    <td className="px-0.5 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onScoreUpdate(
                                                    student._originalIndex,
                                                    "q9b",
                                                    !student.scores.q9b,
                                                )
                                            }
                                            className={`w-8 h-8 rounded-lg border-2 text-sm font-bold transition-base ${
                                                student.scores.q9b
                                                    ? "bg-red-100 border-red-400 text-red-600"
                                                    : "bg-gray-50 border-gray-200 text-gray-300 hover:border-gray-300"
                                            }`}
                                        >
                                            {student.scores.q9b ? "✓" : "✗"}
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-800 font-bold bg-white/20">
                                        {student.totalScore}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span
                                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${getRiskLevelConfig(student.riskLevel).bgSolid}`}
                                        >
                                            {
                                                getRiskLevelConfig(
                                                    student.riskLevel,
                                                ).label
                                            }
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
