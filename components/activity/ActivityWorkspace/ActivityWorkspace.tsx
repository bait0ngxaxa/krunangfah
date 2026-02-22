"use client";

import Link from "next/link";
import {
    MessageCircle,
    CheckCircle2,
    ArrowRight,
    Eye,
    FileText,
} from "lucide-react";
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
        pendingCompletion,
        completedUploads,
        handleConfirmComplete,
        handleFileSelect,
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

            <div className="min-h-screen bg-slate-50 py-8 px-4 relative overflow-hidden">
                <div className="max-w-4xl mx-auto relative z-10">
                    <WorkspaceHeader
                        studentId={studentId}
                        studentName={studentName}
                        activityTitle={currentActivity.title}
                        config={config}
                    />

                    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border-2 border-gray-100 relative overflow-hidden animate-fade-in-up">
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

                        {/* Upload & Teacher Notes — side by side */}
                        {pendingCompletion ? (
                            <div className="flex flex-col items-center gap-5 py-6 px-4 bg-green-50 border-2 border-green-200 rounded-2xl">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    อัปโหลดใบงานครบแล้ว!
                                </h3>

                                {/* รายการไฟล์ที่อัปโหลด (เก็บไว้ใน state) */}
                                {completedUploads.length > 0 && (
                                    <div className="w-full space-y-2">
                                        {completedUploads.map((upload) => (
                                            <div
                                                key={upload.id}
                                                className="flex items-center justify-between bg-white p-3 rounded-xl border border-green-200 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText className="w-5 h-5 text-green-600" />
                                                    <span className="text-gray-700 font-medium truncate">
                                                        {upload.fileName}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setPreviewFile({
                                                            url: upload.fileUrl,
                                                            name: upload.fileName,
                                                        })
                                                    }
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-all shadow-sm hover:shadow-md shrink-0"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    พรีวิว
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-gray-500 text-sm">
                                    กดยืนยันเพื่อดำเนินการต่อ
                                </p>
                                <button
                                    onClick={handleConfirmComplete}
                                    className={`px-8 py-3 bg-[#0BD0D9] text-white rounded-xl font-bold text-lg hover:shadow-md hover:-translate-y-0.5 hover:bg-[#09B8C0] transition-all flex items-center gap-2`}
                                >
                                    ยืนยันจบกิจกรรม
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : currentProgress ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Upload Section */}
                                <UploadSection
                                    currentProgress={currentProgress}
                                    currentActivityNumber={
                                        currentActivityNumber
                                    }
                                    riskLevel={riskLevel}
                                    uploading={uploading}
                                    onFileSelect={handleFileSelect}
                                    onPreview={setPreviewFile}
                                />

                                {/* Teacher Notes */}
                                <TeacherNotesSection
                                    notes={teacherNotes}
                                    onNotesChange={setTeacherNotes}
                                    onSave={handleSaveNotes}
                                    isSaving={savingNotes}
                                />
                            </div>
                        ) : null}

                        {/* Conversation Button */}
                        <div className="pt-6 border-t border-emerald-100 mt-8">
                            <Link
                                href={`/students/${studentId}/help/conversation`}
                                className="w-full py-4 bg-[#34D399] text-white rounded-xl font-bold hover:shadow-md hover:-translate-y-0.5 hover:bg-emerald-400 transition-all text-center text-lg flex items-center justify-center gap-2 group"
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
