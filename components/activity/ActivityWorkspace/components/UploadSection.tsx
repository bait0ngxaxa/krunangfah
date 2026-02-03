import { Upload, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { UPLOAD_COLOR_CONFIG } from "../constants";
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

    return (
        <div
            className={`${uploadColors.bgLight} border ${uploadColors.border} p-6 rounded-xl`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3
                    className={`font-bold ${uploadColors.textDark} flex items-center gap-2`}
                >
                    <Upload className="w-5 h-5" />
                    อัปโหลดใบงานที่ทำเสร็จแล้ว
                </h3>
                <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                        uploadedCount >= requiredCount
                            ? `${uploadColors.completeBg} text-white`
                            : "bg-yellow-100 text-yellow-700"
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
                            className={`flex items-center justify-between bg-white p-3 rounded-lg border ${uploadColors.itemBorder}`}
                        >
                            <span className="text-gray-700 font-medium truncate">
                                {upload.fileName}
                            </span>
                            <button
                                onClick={() =>
                                    onPreview({
                                        url: upload.fileUrl,
                                        name: upload.fileName,
                                    })
                                }
                                className={`inline-flex items-center gap-1 px-3 py-1 ${uploadColors.button} text-white rounded-full text-xs font-medium ${uploadColors.buttonHover} transition-colors shrink-0`}
                            >
                                <Eye className="w-3 h-3" />
                                พรีวิว
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {remaining > 0 ? (
                <>
                    <p className={`${uploadColors.completeText} text-sm mb-3`}>
                        📝 ต้องอัปโหลดอีก {remaining} ไฟล์
                        เพื่อเสร็จสิ้นกิจกรรมนี้
                    </p>
                    <button
                        onClick={() => onFileSelect(currentProgress.id)}
                        disabled={uploading === currentProgress.id}
                        className={`w-full py-3 ${uploadColors.button} text-white rounded-xl font-medium ${uploadColors.buttonHover} transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                        {uploading === currentProgress.id ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                กำลังอัปโหลด...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                อัปโหลดใบงานที่ {uploadedCount + 1}
                            </>
                        )}
                    </button>
                </>
            ) : (
                <div
                    className={`flex items-center gap-2 ${uploadColors.completeText} font-medium`}
                >
                    <CheckCircle2 className="w-5 h-5" />
                    เสร็จสิ้นกิจกรรมแล้ว!
                </div>
            )}
        </div>
    );
}
