import { useState, useCallback } from "react";
import {
    RISK_LABELS,
    RISK_BG_CLASSES,
    type PhqScores,
} from "@/lib/utils/phq-scoring";
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
            className="w-10 h-8 text-center text-sm font-mono border border-gray-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
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
    return (
        <div className="bg-white/60 backdrop-blur-xl rounded-4xl shadow-2xl overflow-hidden border border-emerald-200 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-emerald-300 to-teal-300" />

            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
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
                            {students.map((student, index) => (
                                <tr
                                    key={index}
                                    className="hover:bg-white/60 transition-colors group"
                                >
                                    <td className="px-4 py-2 text-sm text-gray-500 font-medium">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-bold text-gray-800 group-hover:text-emerald-600 transition-colors whitespace-nowrap">
                                        {student.firstName} {student.lastName}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-600">
                                        {student.class}
                                    </td>
                                    {/* Editable score inputs (0-3) — Map created once per student */}
                                    {(() => {
                                        const scoreMap = new Map(
                                            Object.entries(student.scores),
                                        );
                                        return SCORE_KEYS.map((key) => (
                                            <td
                                                key={key}
                                                className="px-0.5 py-2"
                                            >
                                                <ScoreInput
                                                    value={
                                                        (scoreMap.get(
                                                            key,
                                                        ) as number) ?? 0
                                                    }
                                                    onChange={(val) =>
                                                        onScoreUpdate(
                                                            student._originalIndex,
                                                            key,
                                                            val,
                                                        )
                                                    }
                                                />
                                            </td>
                                        ));
                                    })()}
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
                                            className={`w-8 h-8 rounded-lg border-2 text-sm font-bold transition-all ${
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
                                            className={`w-8 h-8 rounded-lg border-2 text-sm font-bold transition-all ${
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
                                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${RISK_BG_CLASSES[student.riskLevel]}`}
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
