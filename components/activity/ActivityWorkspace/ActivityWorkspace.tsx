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
    ScheduleDateSection,
} from "./components";
import { getDownloadUrls } from "./constants";
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
    phqResultId,
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
        handleConfirmComplete,
        handleFileSelect,
        handleDeleteUpload,
        handleSaveNotes,
    } = useActivityWorkspace({
        studentId,
        riskLevel,
        activityProgress,
        phqResultId,
    });

    // Get download URLs for current activity
    const downloadUrls = currentActivityNumber
        ? getDownloadUrls(currentActivityNumber)
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

            <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8">
                <div className="max-w-4xl mx-auto relative z-10">
                    <WorkspaceHeader
                        studentId={studentId}
                        studentName={studentName}
                        activityTitle={currentActivity.title}
                        config={config}
                    />

                    <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/70 to-emerald-50/40 p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-8">
                        <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />
                        {/* Action Buttons */}
                        <ActionButtons
                            studentId={studentId}
                            config={config}
                            activityNumber={currentActivityNumber}
                            downloadUrls={downloadUrls}
                            phqResultId={phqResultId}
                        />

                        {/* Worksheets */}
                        <WorksheetGallery
                            activityTitle={currentActivity.title}
                            worksheets={currentActivity.worksheets}
                        />

                        {/* Progress Indicator */}
                        <ProgressIndicator
                            activities={activities}
                            activityProgress={activityProgress}
                            activityNumbers={activityNumbers}
                            currentActivityNumber={currentActivityNumber}
                            riskLevel={riskLevel}
                        />

                        {/* Schedule Date Picker */}
                        {currentProgress && (
                            <ScheduleDateSection
                                activityProgressId={currentProgress.id}
                                currentDate={currentProgress.scheduledDate}
                                isLocked={currentProgress.status === "locked"}
                            />
                        )}

                        {/* Upload & Teacher Notes — side by side */}
                        {currentProgress ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Upload Section — preview, delete, confirm all in one */}
                                <UploadSection
                                    currentProgress={currentProgress}
                                    currentActivityNumber={
                                        currentActivityNumber
                                    }
                                    riskLevel={riskLevel}
                                    uploading={uploading}
                                    onFileSelect={handleFileSelect}
                                    onRemove={handleDeleteUpload}
                                    onConfirmComplete={handleConfirmComplete}
                                    onPreview={setPreviewFile}
                                />

                                {/* Teacher Notes */}
                                <TeacherNotesSection
                                    notes={teacherNotes}
                                    onNotesChange={setTeacherNotes}
                                    onSave={handleSaveNotes}
                                    isSaving={savingNotes}
                                    savedNotes={currentProgress?.teacherNotes}
                                />
                            </div>
                        ) : null}

                        {/* Conversation Button */}
                        <div className="mt-8 border-t border-slate-200/80 pt-6">
                            <Link
                                href={`/students/${studentId}/help/conversation`}
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-center text-lg font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-lg"
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
