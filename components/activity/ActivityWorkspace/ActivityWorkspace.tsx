"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
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
import { DOWNLOAD_URLS } from "./constants";
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
        handleFileSelect,
        handleSaveNotes,
    } = useActivityWorkspace({ studentId, riskLevel, activityProgress });

    // Get download URLs for current activity
    const downloadUrls = currentActivityNumber
        ? DOWNLOAD_URLS[currentActivityNumber] || []
        : [];

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

            <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                    <div className="absolute bottom-10 left-10 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
                </div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <WorkspaceHeader
                        studentId={studentId}
                        studentName={studentName}
                        activityTitle={currentActivity.title}
                        config={config}
                    />

                    <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-6 md:p-8 border border-pink-100 relative overflow-hidden animate-fade-in-up">
                        <div
                            className={`absolute top-0 left-0 w-full h-1.5 bg-linear-to-r ${config.gradient}`}
                        />

                        {/* Action Buttons */}
                        <ActionButtons
                            studentId={studentId}
                            config={config}
                            activityNumber={currentActivityNumber}
                            downloadUrls={downloadUrls}
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
                        <div className="pt-6 border-t border-pink-100 mt-8">
                            <Link
                                href={`/students/${studentId}/help/conversation`}
                                className="w-full py-4 bg-linear-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all text-center text-lg shadow-md flex items-center justify-center gap-2 group"
                            >
                                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                หลักการพูดคุย
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
