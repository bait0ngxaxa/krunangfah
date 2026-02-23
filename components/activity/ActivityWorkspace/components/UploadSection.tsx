import {
    Upload,
    CheckCircle2,
    Eye,
    Loader2,
    FileText,
    X,
    ArrowRight,
} from "lucide-react";
import { getUploadColors, getWorksheetNames } from "../constants";
import type { ActivityProgressData, PreviewFile } from "../types";

interface UploadSectionProps {
    currentProgress: ActivityProgressData;
    currentActivityNumber: number;
    riskLevel: "orange" | "yellow" | "green";
    uploading: string | null;
    onFileSelect: (progressId: string) => void;
    onRemove: (uploadId: string) => Promise<void>;
    onConfirmComplete: () => Promise<void>;
    onPreview: (file: PreviewFile) => void;
}

/**
 * Upload section for worksheet submissions
 * Handles upload, preview, delete, and confirm completion — all in one view
 */
export function UploadSection({
    currentProgress,
    currentActivityNumber,
    riskLevel,
    uploading,
    onFileSelect,
    onRemove,
    onConfirmComplete,
    onPreview,
}: UploadSectionProps) {
    const requiredCount = currentActivityNumber === 5 ? 1 : 2;
    const uploadedCount = currentProgress.worksheetUploads.length;
    const remaining = requiredCount - uploadedCount;
    const allUploaded = remaining <= 0;
    const uploadColors = getUploadColors(riskLevel);

    // Find the next available worksheet slot
    const existingNumbers = new Set(
        currentProgress.worksheetUploads.map((u) => u.worksheetNumber),
    );
    let nextSlot = 1;
    while (existingNumbers.has(nextSlot)) {
        nextSlot++;
    }

    // Get worksheet name for the next slot
    const worksheetNames = getWorksheetNames(currentActivityNumber);
    const nextWorksheetName = worksheetNames[nextSlot - 1];

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
                        allUploaded
                            ? `${uploadColors.completeBg} text-white`
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}
                >
                    {uploadedCount}/{requiredCount} ไฟล์
                </span>
            </div>

            {/* Uploaded files with preview + delete */}
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
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() =>
                                        onPreview({
                                            url: upload.fileUrl,
                                            name: upload.fileName,
                                        })
                                    }
                                    className={`inline-flex items-center gap-2 px-4 py-2 ${uploadColors.button} text-white rounded-lg text-xs font-bold ${uploadColors.buttonHover} transition-all shadow-sm hover:shadow-md`}
                                >
                                    <Eye className="w-4 h-4" />
                                    พรีวิว
                                </button>
                                <button
                                    onClick={() => {
                                        if (
                                            confirm(
                                                "ต้องการลบไฟล์นี้เพื่ออัปโหลดใหม่หรือไม่?",
                                            )
                                        ) {
                                            onRemove(upload.id);
                                        }
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 hover:text-red-600 transition-all"
                                    title="ลบไฟล์"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!allUploaded ? (
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
                                        อัปโหลดใบงานที่ {nextSlot}
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
                /* All files uploaded — show confirm button */
                <div className="flex flex-col items-center gap-4 mt-auto">
                    <div className="flex items-center gap-2 text-green-600 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        อัปโหลดใบงานครบแล้ว!
                    </div>
                    <p className="text-gray-500 text-sm text-center">
                        ตรวจสอบไฟล์ แล้วกดยืนยันเพื่อจบกิจกรรม
                    </p>
                    <button
                        onClick={onConfirmComplete}
                        className="w-full px-6 py-3 bg-[#0BD0D9] text-white rounded-xl font-bold text-lg hover:shadow-md hover:-translate-y-0.5 hover:bg-[#09B8C0] transition-all flex items-center justify-center gap-2"
                    >
                        ยืนยันจบกิจกรรม
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
