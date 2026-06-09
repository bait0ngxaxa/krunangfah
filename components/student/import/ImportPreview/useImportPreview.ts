import {
    useState,
    useEffect,
    useMemo,
    useTransition,
    useCallback,
    useRef,
} from "react";
import {
    hasRound1Data,
    getIncompleteActivityWarning,
} from "@/lib/actions/student/main";
import { importStudents } from "@/lib/actions/student/mutations";
import { getAcademicYears } from "@/lib/actions/academic-year.actions";
import { getCurrentTeacherProfile } from "@/lib/actions/teacher.actions";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import type {
    ImportPreviewProps,
    UseImportPreviewReturn,
    TeacherProfile,
    AcademicYear,
} from "./types";
import type { IncompleteActivityInfo } from "@/lib/actions/student/types";
import {
    buildImportStudentsPayload,
    buildZeroScoreWarning,
    createPreviewStudents,
    filterPreviewStudents,
    formatParseImportErrors,
    formatImportIssues,
    getImportedClasses,
} from "./utils";

/**
 * Custom hook for managing ImportPreview state and logic
 */
export function useImportPreview({
    data,
    parseErrors = [],
    onSuccess,
}: Pick<
    ImportPreviewProps,
    "data" | "parseErrors" | "onSuccess"
>): UseImportPreviewReturn {
    // State
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(() =>
        formatParseImportErrors(parseErrors),
    );
    const [errorTitle, setErrorTitle] = useState<string>(() =>
        parseErrors.length > 0
            ? "ไฟล์มีบางแถวที่ไม่พร้อมนำเข้า"
            : "นำเข้าข้อมูลไม่สำเร็จ",
    );
    const [errorDescription, setErrorDescription] = useState<string>(() =>
        parseErrors.length > 0
            ? "ระบบจะแสดงพรีวิวเฉพาะแถวที่ข้อมูลครบ กรุณาตรวจสอบแถวที่ไม่ผ่านด้านล่าง"
            : "กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง",
    );
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [assessmentRound, setAssessmentRound] = useState<number>(1);
    const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(
        null,
    );
    const [schoolClassNames, setSchoolClassNames] = useState<string[]>([]);
    const [isImportContextLoaded, setIsImportContextLoaded] =
        useState<boolean>(false);
    const [round1Exists, setRound1Exists] = useState<boolean>(false);
    const [incompleteWarning, setIncompleteWarning] =
        useState<IncompleteActivityInfo | null>(null);
    const roundCheckRequestRef = useRef(0);
    const isSavingRef = useRef(false);

    // Editable student data — initialized from parsed Excel, can be modified in preview
    const [editableData, setEditableData] = useState(() =>
        createPreviewStudents(data),
    );

    // Use editableData for all downstream computations
    const allPreviewData = editableData;

    // Filter data + count risk levels in a single pass (combined iterations)
    const { previewData, filteredOutStudents, riskCounts } = useMemo(() => {
        return filterPreviewStudents({
            students: allPreviewData,
            schoolClassNames,
            teacherProfile,
            isImportContextLoaded,
        });
    }, [
        allPreviewData,
        isImportContextLoaded,
        schoolClassNames,
        teacherProfile,
    ]);

    const zeroScoreWarning = useMemo(
        () => buildZeroScoreWarning(previewData),
        [previewData],
    );

    // Load initial data
    useEffect(() => {
        let isActive = true;

        const loadData = async (): Promise<void> => {
            try {
                const [years, profile, classes] = await Promise.all([
                    getAcademicYears(),
                    getCurrentTeacherProfile().catch((err) => {
                        console.error("Failed to load teacher profile:", err);
                        return null;
                    }),
                    getSchoolClasses(),
                ]);

                if (!isActive) {
                    return;
                }

                setAcademicYears(years);
                setSchoolClassNames(classes.map((schoolClass) => schoolClass.name));
                const current = years.find((year) => year.isCurrent);
                const initialYearId = current?.id ?? years[0]?.id ?? "";

                if (initialYearId) {
                    setSelectedYearId(initialYearId);
                    const requestId = roundCheckRequestRef.current + 1;
                    roundCheckRequestRef.current = requestId;
                    hasRound1Data(initialYearId)
                        .then((exists) => {
                            if (isActive && roundCheckRequestRef.current === requestId) {
                                setRound1Exists(exists);
                            }
                        })
                        .catch(() => {
                            if (isActive && roundCheckRequestRef.current === requestId) {
                                setRound1Exists(false);
                            }
                        });
                }

                if (profile) {
                    setTeacherProfile({
                        role: profile.user.role,
                        advisoryClass: profile.advisoryClass,
                    });
                }

                setIsImportContextLoaded(true);
            } catch (err) {
                console.error("Failed to load import context:", err);
                if (!isActive) {
                    return;
                }
                setErrorTitle("โหลดข้อมูลประกอบไม่สำเร็จ");
                setErrorDescription("กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง");
                setError(
                    "ไม่สามารถโหลดปีการศึกษาและข้อมูลห้องเรียนได้ กรุณารีเฟรชหน้าแล้วลองใหม่",
                );
                setIsImportContextLoaded(true);
            }
        };

        loadData();

        return () => {
            isActive = false;
        };
    }, []);

    // Extract unique classes from importable data — used to scope the warning
    const importedClasses = useMemo(() => {
        return getImportedClasses(previewData);
    }, [previewData]);

    // Handler: when user changes academic year, also check round 1
    // Round resets to 1 on year change — round 1 has no previous round,
    // so incomplete activity warning is always cleared here
    const handleYearChange = useCallback(
        async (yearId: string) => {
            setSelectedYearId(yearId);
            setAssessmentRound(1);
            setIncompleteWarning(null);
            const requestId = roundCheckRequestRef.current + 1;
            roundCheckRequestRef.current = requestId;

            if (!yearId) {
                setRound1Exists(false);
                return;
            }

            try {
                const exists = await hasRound1Data(yearId);
                if (roundCheckRequestRef.current === requestId) {
                    setRound1Exists(exists);
                }
            } catch {
                if (roundCheckRequestRef.current === requestId) {
                    setRound1Exists(false);
                }
            }
        },
        [],
    );

    // Handler: when user changes assessment round, check incomplete activities
    const handleRoundChange = useCallback(
        async (round: number) => {
            setAssessmentRound(round);
            if (!selectedYearId) {
                setIncompleteWarning(null);
                return;
            }
            try {
                const warning = await getIncompleteActivityWarning(
                    selectedYearId,
                    round,
                    importedClasses,
                );
                setIncompleteWarning(warning);
            } catch {
                setIncompleteWarning(null);
            }
        },
        [selectedYearId, importedClasses],
    );

    const handleRemoveStudent = useCallback((studentIndex: number) => {
        setEditableData((prev) =>
            prev.filter((student) => student._originalIndex !== studentIndex),
        );
    }, []);

    const handleDismissError = useCallback(() => {
        setError(null);
    }, []);

    // Handle save action — send only previewData (filtered by role) to match the confirmed count
    const handleSave = () => {
        if (isSavingRef.current) {
            return;
        }

        if (!selectedYearId) {
            setErrorTitle("นำเข้าข้อมูลไม่สำเร็จ");
            setErrorDescription("กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง");
            setError("กรุณาเลือกปีการศึกษา");
            return;
        }

        if (previewData.length === 0) {
            setErrorTitle("นำเข้าข้อมูลไม่สำเร็จ");
            setErrorDescription("กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง");
            setError("ไม่มีนักเรียนให้นำเข้า กรุณาอัปโหลดไฟล์ใหม่");
            return;
        }

        setError(null);
        isSavingRef.current = true;

        startTransition(async () => {
            try {
                // Send only filtered students (previewData) — not all editableData
                // This matches the count shown in the confirm dialog
                const studentsToImport = buildImportStudentsPayload(previewData);
                const result = await importStudents(
                    studentsToImport,
                    selectedYearId,
                    assessmentRound,
                );
                const hasImportedRows =
                    typeof result.imported === "number" && result.imported > 0;

                if (
                    result.status === "success" ||
                    result.status === "partial" ||
                    hasImportedRows
                ) {
                    onSuccess({
                        ...result,
                        success: true,
                        status:
                            result.status === "success" ? "success" : "partial",
                    });
                } else {
                    setErrorTitle("นำเข้าข้อมูลไม่สำเร็จ");
                    setErrorDescription(
                        "กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง",
                    );
                    setError(formatImportIssues(result));
                }
            } catch (err) {
                console.error("Import error:", err);
                setErrorTitle("นำเข้าข้อมูลไม่สำเร็จ");
                setErrorDescription("กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง");
                setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            } finally {
                isSavingRef.current = false;
            }
        });
    };

    return {
        // State
        isLoading: isPending,
        error,
        errorTitle,
        errorDescription,
        isImportContextLoaded,
        academicYears,
        selectedYearId,
        assessmentRound,
        teacherProfile,
        schoolClassNames,
        hasRound1: round1Exists,
        incompleteWarning,
        zeroScoreWarning,

        // Computed values
        previewData,
        filteredOutStudents,
        riskCounts,

        // Actions
        handleYearChange,
        setAssessmentRound: handleRoundChange,
        handleRemoveStudent,
        handleDismissError,
        handleSave,
    };
}
