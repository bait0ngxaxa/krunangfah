"use client";

import { BarChart3 } from "lucide-react";
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
        handleYearChange,
        assessmentRound,
        setAssessmentRound,
        hasRound1,
        teacherProfile,
        previewData,
        filteredOutStudents,
        riskCounts,
        handleScoreUpdate,
        handleSave,
    } = useImportPreview({ data, onSuccess });

    return (
        <div className="space-y-6">
            {/* Summary Section */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-100/50 p-6 md:p-8 border border-emerald-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400 opacity-60" />

                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-emerald-500" />
                    <span className="bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        สรุปข้อมูลที่จะนำเข้า
                    </span>
                </h3>

                <RiskSummaryCards riskCounts={riskCounts} />

                <div className="my-6 border-t border-emerald-100/50" />

                <ImportSettings
                    academicYears={academicYears}
                    selectedYearId={selectedYearId}
                    onYearChange={handleYearChange}
                    assessmentRound={assessmentRound}
                    onRoundChange={setAssessmentRound}
                    hasRound1={hasRound1}
                />

                <FilteredStudentsWarning
                    students={filteredOutStudents}
                    advisoryClass={teacherProfile?.advisoryClass ?? null}
                />
            </div>

            {/* Data Table */}
            <StudentPreviewTable
                students={previewData}
                onScoreUpdate={handleScoreUpdate}
            />

            {/* Error Display */}
            <ImportError error={error} />

            {/* Action Buttons */}
            <ImportActions
                onCancel={onCancel}
                onSave={handleSave}
                isLoading={isLoading}
                canSave={!!selectedYearId && previewData.length > 0}
                studentCount={previewData.length}
                academicYearLabel={(() => {
                    const y = academicYears.find(
                        (yr) => yr.id === selectedYearId,
                    );
                    return y ? `${y.year} เทอม ${y.semester}` : "";
                })()}
                assessmentRound={assessmentRound}
            />
        </div>
    );
}
