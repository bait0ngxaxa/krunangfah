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
import { getCurrentAcademicYearTerms } from "@/lib/actions/academic-year.actions";
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
    getAcademicYearLabel,
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
    const [hasImportContextError, setHasImportContextError] = useState(false);
    const [importContextQueryError, setImportContextQueryError] = useState<{
        requestId: string;
        message?: string;
    } | null>(null);
    const [round1Exists, setRound1Exists] = useState<boolean>(false);
    const [isRound1Checking, setIsRound1Checking] = useState(false);
    const [round1CheckFailed, setRound1CheckFailed] = useState(false);
    const [incompleteCheckFailed, setIncompleteCheckFailed] = useState(false);
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
                const [yearsResult, profile, classes] = await Promise.all([
                    getCurrentAcademicYearTerms(),
                    getCurrentTeacherProfile().catch((err) => {
                        console.error("Failed to load teacher profile:", err);
                        return null;
                    }),
                    getSchoolClasses(),
                ]);

                if (!isActive) {
                    return;
                }

                if (yearsResult.status === "transient_error") {
                    setHasImportContextError(true);
                    setImportContextQueryError({
                        requestId: yearsResult.requestId,
                        message: yearsResult.message,
                    });
                    setErrorTitle("โหลดข้อมูลประกอบไม่สำเร็จ");
                    setErrorDescription(
                        "กรุณาตรวจสอบรายละเอียดด้านล่างแล้วลองอีกครั้ง",
                    );
                    setError(
                        `${yearsResult.message ?? "ไม่สามารถโหลดข้อมูลปีการศึกษาได้ กรุณาลองใหม่อีกครั้ง"} รหัสอ้างอิง: ${yearsResult.requestId}`,
                    );
                    setIsImportContextLoaded(true);
                    return;
                }
                if (
                    yearsResult.status === "forbidden" ||
                    yearsResult.status === "not_found"
                ) {
                    setHasImportContextError(true);
                    setErrorTitle("โหลดข้อมูลประกอบไม่สำเร็จ");
                    setError("ไม่มีสิทธิ์เข้าถึงข้อมูลปีการศึกษา");
                    setIsImportContextLoaded(true);
                    return;
                }
                const years = yearsResult.data;
                setAcademicYears(years);
                setSchoolClassNames(classes.map((schoolClass) => schoolClass.name));
                const current = years.find((year) => year.isCurrent);
                const initialYearId = current?.id ?? years[0]?.id ?? "";

                if (initialYearId) {
                    setSelectedYearId(initialYearId);
                    const requestId = roundCheckRequestRef.current + 1;
                    roundCheckRequestRef.current = requestId;
                    setIsRound1Checking(true);
                    setRound1CheckFailed(false);
                    hasRound1Data(initialYearId)
                        .then((round1Result) => {
                            if (!isActive || roundCheckRequestRef.current !== requestId) {
                                return;
                            }
                            setIsRound1Checking(false);
                            if (round1Result.status === "transient_error") {
                                setRound1CheckFailed(true);
                                setErrorTitle("ตรวจสอบข้อมูลครั้งที่ 1 ไม่สำเร็จ");
                                setError(
                                    `${round1Result.message ?? "ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง"} รหัสอ้างอิง: ${round1Result.requestId}`,
                                );
                                return;
                            }
                            if (
                                round1Result.status === "forbidden" ||
                                round1Result.status === "not_found"
                            ) {
                                setRound1CheckFailed(true);
                                setError("ไม่มีสิทธิ์ตรวจสอบข้อมูลครั้งที่ 1");
                                return;
                            }
                            setRound1Exists(round1Result.data);
                        })
                        .catch(() => {
                            if (isActive && roundCheckRequestRef.current === requestId) {
                                setIsRound1Checking(false);
                                setRound1CheckFailed(true);
                                setError("ไม่สามารถตรวจสอบข้อมูลครั้งที่ 1 ได้");
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
                setHasImportContextError(true);
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
            setIncompleteCheckFailed(false);
            setRound1Exists(false);
            const requestId = roundCheckRequestRef.current + 1;
            roundCheckRequestRef.current = requestId;

            if (!yearId) {
                setRound1Exists(false);
                setRound1CheckFailed(false);
                return;
            }

            setIsRound1Checking(true);
            setRound1CheckFailed(false);
            try {
                const result = await hasRound1Data(yearId);
                if (roundCheckRequestRef.current === requestId) {
                    setIsRound1Checking(false);
                    if (result.status === "transient_error") {
                        setRound1CheckFailed(true);
                        setErrorTitle("ตรวจสอบข้อมูลครั้งที่ 1 ไม่สำเร็จ");
                        setError(
                            `${result.message ?? "ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง"} รหัสอ้างอิง: ${result.requestId}`,
                        );
                    } else if (
                        result.status === "forbidden" ||
                        result.status === "not_found"
                    ) {
                        setRound1CheckFailed(true);
                        setError("ไม่มีสิทธิ์ตรวจสอบข้อมูลครั้งที่ 1");
                    } else {
                        setRound1Exists(result.data);
                    }
                }
            } catch {
                if (roundCheckRequestRef.current === requestId) {
                    setIsRound1Checking(false);
                    setRound1CheckFailed(true);
                    setError("ไม่สามารถตรวจสอบข้อมูลครั้งที่ 1 ได้");
                }
            }
        },
        [],
    );

    // Handler: when user changes assessment round, check incomplete activities
    const handleRoundChange = useCallback(
        async (round: number) => {
            setAssessmentRound(round);
            setIncompleteCheckFailed(false);
            if (!selectedYearId) {
                setIncompleteWarning(null);
                return;
            }
            try {
                const result = await getIncompleteActivityWarning(
                    selectedYearId,
                    round,
                    importedClasses,
                );
                if (result.status === "transient_error") {
                    setIncompleteWarning(null);
                    setIncompleteCheckFailed(true);
                    setErrorTitle("ตรวจสอบกิจกรรมค้างไม่สำเร็จ");
                    setError(
                        `${result.message ?? "ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง"} รหัสอ้างอิง: ${result.requestId}`,
                    );
                    return;
                }
                if (
                    result.status === "forbidden" ||
                    result.status === "not_found"
                ) {
                    setIncompleteWarning(null);
                    setIncompleteCheckFailed(true);
                    setError("ไม่มีสิทธิ์ตรวจสอบกิจกรรมค้าง");
                    return;
                }
                setIncompleteWarning(result.data);
            } catch {
                setIncompleteWarning(null);
                setIncompleteCheckFailed(true);
                setError("ไม่สามารถตรวจสอบกิจกรรมค้างได้");
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
                    }, {
                        academicYearId: selectedYearId,
                        academicYearLabel: getAcademicYearLabel(
                            academicYears,
                            selectedYearId,
                        ),
                        assessmentRound,
                        classNames: getImportedClasses(previewData),
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
        hasImportContextError,
        importContextQueryError,
        academicYears,
        selectedYearId,
        assessmentRound,
        teacherProfile,
        schoolClassNames,
        hasRound1: round1Exists,
        isRound1Checking,
        round1CheckFailed,
        incompleteCheckFailed,
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
