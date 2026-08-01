"use client";

import { BarChart3 } from "lucide-react";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { Button } from "@/components/ui/Button";
import { useImportPreview } from "./useImportPreview";
import {
    RiskSummaryCards,
    ImportSettings,
    FilteredStudentsWarning,
    StudentPreviewTable,
    ImportActions,
    ImportError,
} from "./components";
import type { ImportPreviewProps } from "./types";
import { getAcademicYearLabel } from "./utils";

/**
 * ImportPreview component - displays parsed student data before import
 * Refactored to follow separation of concerns and modular design
 */
export function ImportPreview({
    data,
    parseErrors,
    onCancel,
    onSuccess,
    canViewNationalId,
}: ImportPreviewProps) {
    const {
        isLoading,
        error,
        errorTitle,
        errorDescription,
        isImportContextLoaded,
        hasImportContextError,
        importContextQueryError,
        academicYears,
        selectedYearId,
        handleYearChange,
        assessmentRound,
        setAssessmentRound,
        hasRound1,
        isRound1Checking,
        round1CheckFailed,
        incompleteCheckFailed,
        teacherProfile,
        schoolClassNames,
        previewData,
        filteredOutStudents,
        riskCounts,
        handleSave,
        handleRemoveStudent,
        handleDismissError,
        incompleteWarning,
        zeroScoreWarning,
    } = useImportPreview({ data, parseErrors, onSuccess });

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                <h3 className="mb-5 flex min-w-0 items-center gap-2 text-lg font-bold text-gray-800">
                    <BarChart3 className="w-6 h-6 text-emerald-500" />
                    <span className="min-w-0 break-words">
                        สรุปข้อมูลที่จะนำเข้า
                    </span>
                </h3>

                {!hasImportContextError ? (
                    <RiskSummaryCards riskCounts={riskCounts} />
                ) : null}

                {!hasImportContextError ? (
                    <div className="my-6 border-t border-emerald-100/50" />
                ) : null}

                {!isImportContextLoaded && (
                    <div
                        className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800"
                        role="status"
                    >
                        กำลังตรวจสอบปีการศึกษา ห้องเรียน และสิทธิ์การนำเข้า…
                    </div>
                )}

                {importContextQueryError ? (
                    <QueryErrorState
                        requestId={importContextQueryError.requestId}
                        message={importContextQueryError.message}
                        onRetry={() => window.location.reload()}
                    />
                ) : hasImportContextError ? (
                    <div
                        className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
                        role="alert"
                    >
                        <p className="text-sm font-semibold text-red-800">
                            {error ??
                                "ไม่สามารถโหลดปีการศึกษาและข้อมูลห้องเรียนได้"}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                            onClick={() => window.location.reload()}
                        >
                            โหลดข้อมูลอีกครั้ง
                        </Button>
                    </div>
                ) : (
                    <ImportSettings
                        academicYears={academicYears}
                        selectedYearId={selectedYearId}
                        onYearChange={handleYearChange}
                        assessmentRound={assessmentRound}
                        onRoundChange={setAssessmentRound}
                        hasRound1={hasRound1}
                        isRound1Checking={isRound1Checking}
                        round1CheckFailed={round1CheckFailed}
                        incompleteCheckFailed={incompleteCheckFailed}
                        isLoading={!isImportContextLoaded}
                    />
                )}

                {!hasImportContextError ? (
                    <FilteredStudentsWarning
                        students={filteredOutStudents}
                        advisoryClass={teacherProfile?.advisoryClass ?? null}
                        validClassNames={schoolClassNames}
                        isClassScoped={teacherProfile?.role === "class_teacher"}
                    />
                ) : null}
            </div>

            {!hasImportContextError ? (
                <StudentPreviewTable
                    students={previewData}
                    onRemoveStudent={handleRemoveStudent}
                    canViewNationalId={canViewNationalId}
                />
            ) : null}

            {!hasImportContextError && (
                <ImportError
                    error={error}
                    title={errorTitle}
                    description={errorDescription}
                    onClose={handleDismissError}
                />
            )}

            <ImportActions
                onCancel={onCancel}
                onSave={handleSave}
                isLoading={isLoading}
                canSave={
                    isImportContextLoaded &&
                    !hasImportContextError &&
                    !!selectedYearId &&
                    !incompleteCheckFailed &&
                    previewData.length > 0
                }
                studentCount={previewData.length}
                academicYearLabel={getAcademicYearLabel(
                    academicYears,
                    selectedYearId,
                )}
                assessmentRound={assessmentRound}
                incompleteWarning={incompleteWarning}
                zeroScoreWarning={zeroScoreWarning}
            />
        </div>
    );
}
