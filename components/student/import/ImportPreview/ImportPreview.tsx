"use client";

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

/**
 * ImportPreview component - displays parsed student data before import
 * Refactored to follow separation of concerns and modular design
 */
export function ImportPreview({
    data,
    onCancel,
    onSuccess,
}: ImportPreviewProps) {
    const {
        isLoading,
        error,
        academicYears,
        selectedYearId,
        setSelectedYearId,
        assessmentRound,
        setAssessmentRound,
        teacherProfile,
        previewData,
        filteredOutStudents,
        riskCounts,
        handleSave,
    } = useImportPreview({ data, onSuccess });

    return (
        <div className="space-y-6">
            {/* Summary Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    สรุปข้อมูลที่จะนำเข้า
                </h3>

                <RiskSummaryCards riskCounts={riskCounts} />

                <ImportSettings
                    academicYears={academicYears}
                    selectedYearId={selectedYearId}
                    onYearChange={setSelectedYearId}
                    assessmentRound={assessmentRound}
                    onRoundChange={setAssessmentRound}
                />

                <FilteredStudentsWarning
                    students={filteredOutStudents}
                    advisoryClass={teacherProfile?.advisoryClass ?? null}
                />
            </div>

            {/* Data Table */}
            <StudentPreviewTable students={previewData} />

            {/* Error Display */}
            <ImportError error={error} />

            {/* Action Buttons */}
            <ImportActions
                onCancel={onCancel}
                onSave={handleSave}
                isLoading={isLoading}
                canSave={!!selectedYearId && previewData.length > 0}
                studentCount={previewData.length}
            />
        </div>
    );
}
