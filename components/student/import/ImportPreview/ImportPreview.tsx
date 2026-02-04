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
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-white/60 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 via-rose-300 to-purple-400 opacity-60" />

                <h3 className="text-xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    สรุปข้อมูลที่จะนำเข้า
                </h3>

                <RiskSummaryCards riskCounts={riskCounts} />

                <div className="my-6 border-t border-pink-100/50" />

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
