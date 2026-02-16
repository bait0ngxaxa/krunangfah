import { useState, useEffect, useMemo, useTransition } from "react";
import { calculateRiskLevel } from "@/lib/utils/phq-scoring";
import { importStudents } from "@/lib/actions/student";
import {
    getAcademicYears,
    getCurrentTeacherProfile,
} from "@/lib/actions/teacher.actions";
import type {
    ImportPreviewProps,
    UseImportPreviewReturn,
    PreviewStudent,
    RiskCounts,
    TeacherProfile,
    AcademicYear,
} from "./types";

/**
 * Custom hook for managing ImportPreview state and logic
 */
export function useImportPreview({
    data,
    onSuccess,
}: Pick<ImportPreviewProps, "data" | "onSuccess">): UseImportPreviewReturn {
    // State
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [assessmentRound, setAssessmentRound] = useState<number>(1);
    const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(
        null,
    );

    // Calculate scores for all students
    const allPreviewData: PreviewStudent[] = useMemo(
        () =>
            data.map((student) => {
                const { totalScore, riskLevel } = calculateRiskLevel(
                    student.scores,
                );
                return { ...student, totalScore, riskLevel };
            }),
        [data],
    );

    // Filter data + count risk levels in a single pass (combined iterations)
    const { previewData, filteredOutStudents, riskCounts } = useMemo(() => {
        const isClassTeacher =
            teacherProfile?.role === "class_teacher" &&
            !!teacherProfile.advisoryClass;

        const matched: PreviewStudent[] = [];
        const excluded: PreviewStudent[] = [];
        const counts: RiskCounts = {
            blue: 0,
            green: 0,
            yellow: 0,
            orange: 0,
            red: 0,
        };

        for (const student of allPreviewData) {
            if (
                isClassTeacher &&
                student.class !== teacherProfile?.advisoryClass
            ) {
                excluded.push(student);
            } else {
                matched.push(student);
                counts[student.riskLevel]++;
            }
        }

        return {
            previewData: matched,
            filteredOutStudents: excluded,
            riskCounts: counts,
        };
    }, [allPreviewData, teacherProfile]);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            // Load academic years and teacher profile in parallel
            const [years, profile] = await Promise.all([
                getAcademicYears(),
                getCurrentTeacherProfile().catch((err) => {
                    console.error("Failed to load teacher profile:", err);
                    return null;
                }),
            ]);

            setAcademicYears(years);
            const current = years.find((y) => y.isCurrent);
            if (current) {
                setSelectedYearId(current.id);
            } else if (years.length > 0) {
                setSelectedYearId(years[0].id);
            }

            if (profile) {
                setTeacherProfile({
                    role: profile.user.role,
                    advisoryClass: profile.advisoryClass,
                });
            }
        };
        loadData();
    }, []);

    // Handle save action
    const handleSave = () => {
        if (!selectedYearId) {
            setError("กรุณาเลือกปีการศึกษา");
            return;
        }

        setError(null);

        startTransition(async () => {
            try {
                const result = await importStudents(
                    data,
                    selectedYearId,
                    assessmentRound,
                );

                if (result.success) {
                    onSuccess();
                } else {
                    setError(result.message);
                }
            } catch (err) {
                console.error("Import error:", err);
                setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        });
    };

    return {
        // State
        isLoading: isPending,
        error,
        academicYears,
        selectedYearId,
        assessmentRound,
        teacherProfile,

        // Computed values
        previewData,
        filteredOutStudents,
        riskCounts,

        // Actions
        setSelectedYearId,
        setAssessmentRound,
        handleSave,
    };
}
