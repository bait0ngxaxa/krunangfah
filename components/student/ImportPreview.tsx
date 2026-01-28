"use client";

/**
 * Import Preview Component
 * Shows parsed data before saving to database
 */

import { useState, useEffect } from "react";
import { type ParsedStudent } from "@/lib/utils/excel-parser";
import {
    calculateRiskLevel,
    RISK_LABELS,
    RISK_BG_CLASSES,
    type RiskLevel,
} from "@/lib/utils/phq-scoring";
import { importStudents } from "@/lib/actions/student.actions";
import { getAcademicYears } from "@/lib/actions/teacher.actions";

interface ImportPreviewProps {
    data: ParsedStudent[];
    onCancel: () => void;
    onSuccess: () => void;
}

interface PreviewStudent extends ParsedStudent {
    totalScore: number;
    riskLevel: RiskLevel;
}

export function ImportPreview({
    data,
    onCancel,
    onSuccess,
}: ImportPreviewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [academicYears, setAcademicYears] = useState<
        { id: string; year: number; semester: number }[]
    >([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");

    // Calculate scores for all students
    const previewData: PreviewStudent[] = data.map((student) => {
        const { totalScore, riskLevel } = calculateRiskLevel(student.scores);
        return { ...student, totalScore, riskLevel };
    });

    // Count by risk level
    const riskCounts = previewData.reduce(
        (acc, student) => {
            acc[student.riskLevel]++;
            return acc;
        },
        { blue: 0, green: 0, yellow: 0, orange: 0, red: 0 } as Record<
            RiskLevel,
            number
        >,
    );

    useEffect(() => {
        const loadYears = async () => {
            const years = await getAcademicYears();
            setAcademicYears(years);
            // Select current year by default
            const current = years.find((y) => y.isCurrent);
            if (current) {
                setSelectedYearId(current.id);
            } else if (years.length > 0) {
                setSelectedYearId(years[0].id);
            }
        };
        loadYears();
    }, []);

    const handleSave = async () => {
        if (!selectedYearId) {
            setError("กรุณาเลือกปีการศึกษา");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await importStudents(data, selectedYearId);

            if (result.success) {
                onSuccess();
            } else {
                setError(result.message);
            }
        } catch (err) {
            console.error("Import error:", err);
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    สรุปข้อมูลที่จะนำเข้า
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {(
                        [
                            "blue",
                            "green",
                            "yellow",
                            "orange",
                            "red",
                        ] as RiskLevel[]
                    ).map((level) => (
                        <div
                            key={level}
                            className={`${RISK_BG_CLASSES[level]} rounded-lg p-4 text-white text-center`}
                        >
                            <p className="text-2xl font-bold">
                                {riskCounts[level]}
                            </p>
                            <p className="text-sm opacity-90">
                                {RISK_LABELS[level]}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <label className="text-gray-700 font-medium">
                        ปีการศึกษา:
                    </label>
                    <select
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">เลือกปีการศึกษา</option>
                        {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                {year.year} เทอม {year.semester}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
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
                            {previewData.map((student, index) => (
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

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading || !selectedYearId}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            กำลังบันทึก...
                        </>
                    ) : (
                        <>บันทึกข้อมูล ({data.length} คน)</>
                    )}
                </button>
            </div>
        </div>
    );
}
