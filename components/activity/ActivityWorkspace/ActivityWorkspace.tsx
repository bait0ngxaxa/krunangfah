"use client";

import Link from "next/link";
import { useActivityWorkspace } from "./useActivityWorkspace";
import {
    PreviewModal,
    WorkspaceHeader,
    ActionButtons,
    WorksheetGallery,
    UploadSection,
    TeacherNotesSection,
    ProgressIndicator,
} from "./components";
import type { ActivityWorkspaceProps } from "./types";

/**
 * ActivityWorkspace component - main workspace for student activities
 * Refactored to follow separation of concerns and modular design
 */
export function ActivityWorkspace({
    studentId,
    studentName,
    riskLevel,
    activityProgress,
}: ActivityWorkspaceProps) {
    const {
        uploading,
        previewFile,
        setPreviewFile,
        teacherNotes,
        setTeacherNotes,
        savingNotes,
        config,
        activityNumbers,
        activities,
        currentProgress,
        currentActivityNumber,
        currentActivity,
        handleDownload,
        handleFileSelect,
        handleSaveNotes,
    } = useActivityWorkspace({ studentId, riskLevel, activityProgress });

    if (!currentActivity) {
        return null;
    }

    return (
        <>
            {/* Preview Modal */}
            <PreviewModal
                file={previewFile}
                onClose={() => setPreviewFile(null)}
            />

            <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <WorkspaceHeader
                        studentId={studentId}
                        studentName={studentName}
                        activityTitle={currentActivity.title}
                        config={config}
                    />

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 w-full h-2 bg-linear-to-r ${config.gradient}`}
                        />

                        {/* Action Buttons */}
                        <ActionButtons
                            studentId={studentId}
                            firstWorksheetUrl={
                                currentActivity.worksheets[0] || ""
                            }
                            config={config}
                            onDownload={handleDownload}
                        />

                        {/* Worksheets */}
                        <WorksheetGallery
                            activityTitle={currentActivity.title}
                            worksheets={currentActivity.worksheets}
                        />

                        {/* Upload Section */}
                        {currentProgress && (
                            <UploadSection
                                currentProgress={currentProgress}
                                currentActivityNumber={currentActivityNumber}
                                riskLevel={riskLevel}
                                uploading={uploading}
                                onFileSelect={handleFileSelect}
                                onPreview={setPreviewFile}
                            />
                        )}

                        {/* Teacher Notes */}
                        {currentProgress && (
                            <TeacherNotesSection
                                notes={teacherNotes}
                                onNotesChange={setTeacherNotes}
                                onSave={handleSaveNotes}
                                isSaving={savingNotes}
                            />
                        )}

                        {/* Progress Indicator */}
                        <ProgressIndicator
                            activities={activities}
                            activityProgress={activityProgress}
                            activityNumbers={activityNumbers}
                            currentActivityNumber={currentActivityNumber}
                            riskLevel={riskLevel}
                        />

                        {/* Conversation Button */}
                        <div className="pt-6 border-t border-gray-200">
                            <Link
                                href={`/students/${studentId}/help/conversation`}
                                className="block w-full py-4 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-center text-lg"
                            >
                                💬 หลักการพูดคุย
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
