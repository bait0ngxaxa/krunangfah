import { Upload, CheckCircle2, Eye, Loader2, FileText } from "lucide-react";
import { UPLOAD_COLOR_CONFIG, WORKSHEET_NAMES } from "../constants";
import type { ActivityProgressData, PreviewFile } from "../types";

interface UploadSectionProps {
    currentProgress: ActivityProgressData;
    currentActivityNumber: number;
    riskLevel: "orange" | "yellow" | "green";
    uploading: string | null;
    onFileSelect: (progressId: string) => void;
    onPreview: (file: PreviewFile) => void;
}

/**
 * Upload section for worksheet submissions
 */
export function UploadSection({
    currentProgress,
    currentActivityNumber,
    riskLevel,
    uploading,
    onFileSelect,
    onPreview,
}: UploadSectionProps) {
    const requiredCount = currentActivityNumber === 5 ? 1 : 2;
    const uploadedCount = currentProgress.worksheetUploads.length;
    const remaining = requiredCount - uploadedCount;
    const uploadColors = UPLOAD_COLOR_CONFIG[riskLevel];

    // Get worksheet name for current upload
    const worksheetNames = WORKSHEET_NAMES[currentActivityNumber] || [];
    const nextWorksheetName = worksheetNames[uploadedCount];

    return (
        <div
            className={`h-full flex flex-col ${uploadColors.bgLight} border-2 ${uploadColors.border} p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3
                    className={`text-base font-bold ${uploadColors.textDark} flex items-center gap-2`}
                >
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <Upload className="w-4 h-4" />
                    </div>
                    อัปโหลดใบงาน
                </h3>
                <span
                    className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                        uploadedCount >= requiredCount
                            ? `${uploadColors.completeBg} text-white`
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}
                >
                    {uploadedCount}/{requiredCount} ไฟล์
                </span>
            </div>

            {/* Uploaded files */}
            {currentProgress.worksheetUploads.length > 0 && (
                <div className="mb-4 space-y-2">
                    {currentProgress.worksheetUploads.map((upload) => (
                        <div
                            key={upload.id}
                            className={`flex items-center justify-between bg-white p-3 rounded-xl border-2 ${uploadColors.itemBorder} hover:shadow-md transition-all group`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-6 h-6 text-gray-500" />
                                <span className="text-gray-700 font-bold truncate group-hover:text-gray-900 transition-colors">
                                    {upload.fileName}
                                </span>
                            </div>
                            <button
                                onClick={() =>
                                    onPreview({
                                        url: upload.fileUrl,
                                        name: upload.fileName,
                                    })
                                }
                                className={`inline-flex items-center gap-2 px-4 py-2 ${uploadColors.button} text-white rounded-lg text-xs font-bold ${uploadColors.buttonHover} transition-all shadow-sm hover:shadow-md shrink-0`}
                            >
                                <Eye className="w-4 h-4" />
                                พรีวิว
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {remaining > 0 ? (
                <>
                    <p
                        className={`${uploadColors.completeText} text-sm mb-4 font-medium flex items-center gap-2`}
                    >
                        <FileText className="w-4 h-4 animate-pulse" />
                        ต้องอัปโหลดอีก{" "}
                        <span className="font-bold">{remaining}</span> ไฟล์
                        เพื่อเสร็จสิ้นกิจกรรมนี้
                    </p>
                    <button
                        onClick={() => onFileSelect(currentProgress.id)}
                        disabled={uploading === currentProgress.id}
                        className={`w-full py-3 ${uploadColors.button} text-white rounded-xl font-bold text-sm ${uploadColors.buttonHover} transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none`}
                    >
                        {uploading === currentProgress.id ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>กำลังอัปโหลด...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                <div className="text-center">
                                    <div className="text-sm">
                                        อัปโหลดใบงานที่ {uploadedCount + 1}
                                    </div>
                                    {nextWorksheetName && (
                                        <div className="text-xs opacity-90 font-normal">
                                            ({nextWorksheetName})
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </button>
                </>
            ) : (
                <div
                    className={`flex items-center justify-center gap-3 p-4 bg-white/50 rounded-xl border-2 border-dashed ${uploadColors.border} ${uploadColors.completeText} font-bold text-lg animate-pulse-slow`}
                >
                    <CheckCircle2 className="w-6 h-6" />
                    เสร็จสิ้นกิจกรรมแล้ว!
                </div>
            )}
        </div>
    );
}
