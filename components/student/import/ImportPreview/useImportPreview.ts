import {
    useState,
    useEffect,
    useMemo,
    useTransition,
    useCallback,
} from "react";
import { calculateRiskLevel, type PhqScores } from "@/lib/utils/phq-scoring";
import { importStudents, hasRound1Data } from "@/lib/actions/student";
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
    const [round1Exists, setRound1Exists] = useState<boolean>(false);

    // Editable student data — initialized from parsed Excel, can be modified in preview
    const [editableData, setEditableData] = useState(() =>
        data.map((student, idx) => {
            const { totalScore, riskLevel } = calculateRiskLevel(
                student.scores,
            );
            return { ...student, totalScore, riskLevel, _originalIndex: idx };
        }),
    );

    // Use editableData for all downstream computations
    const allPreviewData = editableData;

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
            const initialYearId = current?.id ?? years[0]?.id ?? "";

            if (initialYearId) {
                setSelectedYearId(initialYearId);
                // Check round 1 for the initial academic year
                const exists = await hasRound1Data(initialYearId);
                setRound1Exists(exists);
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

    // Handler: when user changes academic year, also check round 1
    const handleYearChange = useCallback(async (yearId: string) => {
        setSelectedYearId(yearId);
        setAssessmentRound(1); // always reset to round 1 on year change

        if (!yearId) {
            setRound1Exists(false);
            return;
        }

        const exists = await hasRound1Data(yearId);
        setRound1Exists(exists);
    }, []);

    // Handler: update a student's score in preview (before import)
    const handleScoreUpdate = useCallback(
        (
            studentIndex: number,
            field: keyof PhqScores,
            value: number | boolean,
        ) => {
            setEditableData((prev) => {
                const student = prev.at(studentIndex);
                if (!student) return prev;

                const newScores: PhqScores = {
                    ...student.scores,
                    ...({ [field]: value } as Partial<PhqScores>),
                };
                const { totalScore, riskLevel } = calculateRiskLevel(newScores);

                return prev.map((s, i) =>
                    i === studentIndex
                        ? { ...s, scores: newScores, totalScore, riskLevel }
                        : s,
                );
            });
        },
        [],
    );

    // Handle save action
    const handleSave = () => {
        if (!selectedYearId) {
            setError("กรุณาเลือกปีการศึกษา");
            return;
        }

        setError(null);

        startTransition(async () => {
            try {
                // Use editableData (with user's corrections) instead of raw prop data
                const studentsToImport = editableData.map((s) => ({
                    studentId: s.studentId,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    gender: s.gender,
                    age: s.age,
                    class: s.class,
                    scores: s.scores,
                }));
                const result = await importStudents(
                    studentsToImport,
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
        hasRound1: round1Exists,

        // Computed values
        previewData,
        filteredOutStudents,
        riskCounts,

        // Actions
        handleYearChange,
        setAssessmentRound,
        handleScoreUpdate,
        handleSave,
    };
}
