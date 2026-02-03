import { useState, useEffect, useMemo } from "react";
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
    const [isLoading, setIsLoading] = useState(false);
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

    // Filter data based on teacher role
    const previewData = useMemo(() => {
        if (
            teacherProfile?.role === "class_teacher" &&
            teacherProfile.advisoryClass
        ) {
            return allPreviewData.filter(
                (s) => s.class === teacherProfile.advisoryClass,
            );
        }
        return allPreviewData;
    }, [allPreviewData, teacherProfile]);

    // Get filtered out students (for class_teacher only)
    const filteredOutStudents = useMemo(() => {
        if (
            teacherProfile?.role === "class_teacher" &&
            teacherProfile.advisoryClass
        ) {
            return allPreviewData.filter(
                (s) => s.class !== teacherProfile.advisoryClass,
            );
        }
        return [];
    }, [allPreviewData, teacherProfile]);

    // Count by risk level
    const riskCounts = useMemo(() => {
        return previewData.reduce(
            (acc, student) => {
                acc[student.riskLevel]++;
                return acc;
            },
            { blue: 0, green: 0, yellow: 0, orange: 0, red: 0 } as RiskCounts,
        );
    }, [previewData]);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            // Load academic years
            const years = await getAcademicYears();
            setAcademicYears(years);
            const current = years.find((y) => y.isCurrent);
            if (current) {
                setSelectedYearId(current.id);
            } else if (years.length > 0) {
                setSelectedYearId(years[0].id);
            }

            // Load teacher profile
            try {
                const profile = await getCurrentTeacherProfile();
                if (profile) {
                    setTeacherProfile({
                        role: profile.user.role,
                        advisoryClass: profile.advisoryClass,
                    });
                }
            } catch (err) {
                console.error("Failed to load teacher profile:", err);
            }
        };
        loadData();
    }, []);

    // Handle save action
    const handleSave = async () => {
        if (!selectedYearId) {
            setError("กรุณาเลือกปีการศึกษา");
            return;
        }

        setIsLoading(true);
        setError(null);

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
        } finally {
            setIsLoading(false);
        }
    };

    return {
        // State
        isLoading,
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
