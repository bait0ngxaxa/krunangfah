"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    BookOpen,
    Download,
    Lock,
    Upload,
    CheckCircle2,
    Eye,
    X,
    Loader2,
} from "lucide-react";
import {
    uploadWorksheet,
    updateTeacherNotes,
} from "@/lib/actions/activity.actions";
import { useRouter } from "next/navigation";

// Activity configuration
const ACTIVITIES = [
    {
        id: "a1",
        number: 1,
        title: "กิจกรรมที่ 1: รู้จักตัวเอง",
        worksheets: ["/activity/a1/act1-1.jpg", "/activity/a1/act1-2.jpg"],
    },
    {
        id: "a2",
        number: 2,
        title: "กิจกรรมที่ 2: ค้นหาคุณค่าที่ฉันมี",
        worksheets: ["/activity/a2/act2-1.jpg", "/activity/a2/act2-2.jpg"],
    },
    {
        id: "a3",
        number: 3,
        title: "กิจกรรมที่ 3: ปรับความคิด ชีวิตเปลี่ยน",
        worksheets: ["/activity/a3/act3-1.jpg", "/activity/a3/act3-2.jpg"],
    },
    {
        id: "a4",
        number: 4,
        title: "กิจกรรมที่ 4: รู้จักตัวกระตุ้น",
        worksheets: ["/activity/a4/act4-1.jpg", "/activity/a4/act4-2.jpg"],
    },
    {
        id: "a5",
        number: 5,
        title: "กิจกรรมที่ 5: ตามติดเพื่อไปต่อ",
        worksheets: ["/activity/a5/act5.jpg"],
    },
];

const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};

const COLOR_CONFIG: Record<
    string,
    { gradient: string; bg: string; text: string }
> = {
    orange: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-500",
        text: "สีส้ม",
    },
    yellow: {
        gradient: "from-yellow-400 to-amber-400",
        bg: "bg-yellow-400",
        text: "สีเหลือง",
    },
    green: {
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-500",
        text: "สีเขียว",
    },
};

interface ActivityProgressData {
    id: string;
    activityNumber: number;
    status: string;
    teacherNotes?: string | null;
    worksheetUploads: {
        id: string;
        fileName: string;
        fileUrl: string;
    }[];
}

interface ActivityWorkspaceProps {
    studentId: string;
    studentName: string;
    riskLevel: "orange" | "yellow" | "green";
    activityProgress: ActivityProgressData[];
}

export function ActivityWorkspace({
    studentId,
    studentName,
    riskLevel,
    activityProgress,
}: ActivityWorkspaceProps) {
    const router = useRouter();
    const [uploading, setUploading] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<{
        url: string;
        name: string;
    } | null>(null);
    const [teacherNotes, setTeacherNotes] = useState<string>("");
    const [savingNotes, setSavingNotes] = useState(false);

    const config = COLOR_CONFIG[riskLevel];
    const activityNumbers = ACTIVITY_INDICES[riskLevel];
    const activities = activityNumbers
        .map((num) => ACTIVITIES.find((a) => a.number === num))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);

    // Find current activity (first non-completed)
    const currentProgress = activityProgress.find(
        (p) => p.status !== "completed",
    );
    const currentActivityNumber =
        currentProgress?.activityNumber || activityNumbers[0];
    const currentActivity = ACTIVITIES.find(
        (a) => a.number === currentActivityNumber,
    );

    const handleDownload = (worksheetUrl: string) => {
        window.open(worksheetUrl, "_blank");
    };

    const handleUpload = async (progressId: string, file: File) => {
        setUploading(progressId);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadWorksheet(progressId, formData);

            if (result.success) {
                // If activity is completed, redirect to assessment/encouragement
                if (result.completed && result.activityNumber) {
                    if (result.activityNumber === 1) {
                        // Activity 1: Go to assessment
                        router.push(
                            `/students/${studentId}/help/start/assessment?activity=${result.activityNumber}`,
                        );
                    } else {
                        // Activities 2-5: Go to encouragement
                        router.push(
                            `/students/${studentId}/help/start/encouragement?activity=${result.activityNumber}`,
                        );
                    }
                } else {
                    // Not completed yet, just refresh
                    router.refresh();
                }
            } else {
                alert(result.error || "เกิดข้อผิดพลาดในการอัปโหลด");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setUploading(null);
        }
    };

    const handleFileSelect = (progressId: string) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,.pdf";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                handleUpload(progressId, file);
            }
        };
        input.click();
    };

    const handleSaveNotes = async () => {
        if (!currentProgress) return;

        setSavingNotes(true);
        try {
            const result = await updateTeacherNotes(
                currentProgress.id,
                teacherNotes,
            );

            if (result.success) {
                alert("บันทึกโน๊ตสำเร็จ");
                router.refresh();
            } else {
                alert(result.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Save notes error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSavingNotes(false);
        }
    };

    // Initialize teacher notes from current progress
    useEffect(() => {
        if (currentProgress?.teacherNotes) {
            setTeacherNotes(currentProgress.teacherNotes);
        }
    }, [currentProgress]);

    return (
        <>
            {/* Preview Modal */}
            {previewFile && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setPreviewFile(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-bold text-gray-800 truncate">
                                {previewFile.name}
                            </h3>
                            <button
                                onClick={() => setPreviewFile(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[70vh]">
                            {previewFile.url.toLowerCase().endsWith(".pdf") ? (
                                <iframe
                                    src={previewFile.url}
                                    className="w-full h-[60vh]"
                                    title="PDF Preview"
                                />
                            ) : (
                                <Image
                                    src={previewFile.url}
                                    alt={previewFile.name}
                                    width={800}
                                    height={600}
                                    className="w-full h-auto"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Back Button */}
                    <Link
                        href={`/students/${studentId}`}
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>กลับหน้าข้อมูลนักเรียน</span>
                    </Link>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 w-full h-2 bg-linear-to-r ${config.gradient}`}
                        />

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div
                                className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4`}
                            >
                                📚
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                                {currentActivity?.title}
                            </h1>
                            <p className="text-gray-600">
                                {studentName} • {config.text}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <Link
                                href={`/students/${studentId}/help/guidelines`}
                                className={`flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r ${config.gradient} text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md`}
                            >
                                <BookOpen className="w-5 h-5" />
                                หลักการใช้ใบงาน
                            </Link>
                            <button
                                onClick={() =>
                                    handleDownload(
                                        currentActivity?.worksheets[0] || "",
                                    )
                                }
                                className="flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
                            >
                                <Download className="w-5 h-5" />
                                ดาวน์โหลดใบงาน
                            </button>
                        </div>

                        {/* Current Activity Worksheets */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">
                                ใบงาน{currentActivity?.title}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                {currentActivity?.worksheets.map(
                                    (worksheet, wIndex) => (
                                        <div key={wIndex} className="relative">
                                            <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                                                <Image
                                                    src={worksheet}
                                                    alt={`${currentActivity.title} ใบงาน ${wIndex + 1}`}
                                                    width={400}
                                                    height={500}
                                                    className="w-full h-auto object-cover"
                                                />
                                            </div>
                                            <div className="absolute top-3 right-3 bg-white/95 text-gray-700 text-sm px-3 py-1.5 rounded-full shadow-md font-medium">
                                                ใบที่ {wIndex + 1}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>

                            {/* Upload Section */}
                            {currentProgress &&
                                (() => {
                                    const requiredCount =
                                        currentActivityNumber === 5 ? 1 : 2;
                                    const uploadedCount =
                                        currentProgress.worksheetUploads.length;
                                    const remaining =
                                        requiredCount - uploadedCount;

                                    return (
                                        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-green-800 flex items-center gap-2">
                                                    <Upload className="w-5 h-5" />
                                                    อัปโหลดใบงานที่ทำเสร็จแล้ว
                                                </h3>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        uploadedCount >=
                                                        requiredCount
                                                            ? "bg-green-500 text-white"
                                                            : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                                >
                                                    {uploadedCount}/
                                                    {requiredCount} ไฟล์
                                                </span>
                                            </div>

                                            {/* Uploaded files */}
                                            {currentProgress.worksheetUploads
                                                .length > 0 && (
                                                <div className="mb-4 space-y-2">
                                                    {currentProgress.worksheetUploads.map(
                                                        (upload) => (
                                                            <div
                                                                key={upload.id}
                                                                className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-200"
                                                            >
                                                                <span className="text-gray-700 font-medium truncate">
                                                                    {
                                                                        upload.fileName
                                                                    }
                                                                </span>
                                                                <button
                                                                    onClick={() =>
                                                                        setPreviewFile(
                                                                            {
                                                                                url: upload.fileUrl,
                                                                                name: upload.fileName,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium hover:bg-green-600 transition-colors shrink-0"
                                                                >
                                                                    <Eye className="w-3 h-3" />
                                                                    พรีวิว
                                                                </button>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}

                                            {remaining > 0 ? (
                                                <>
                                                    <p className="text-green-700 text-sm mb-3">
                                                        📝 ต้องอัปโหลดอีก{" "}
                                                        {remaining} ไฟล์
                                                        เพื่อเสร็จสิ้นกิจกรรมนี้
                                                    </p>
                                                    <button
                                                        onClick={() =>
                                                            handleFileSelect(
                                                                currentProgress.id,
                                                            )
                                                        }
                                                        disabled={
                                                            uploading ===
                                                            currentProgress.id
                                                        }
                                                        className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {uploading ===
                                                        currentProgress.id ? (
                                                            <>
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                                กำลังอัปโหลด...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-5 h-5" />
                                                                อัปโหลดใบงานที่{" "}
                                                                {uploadedCount +
                                                                    1}
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-700 font-medium">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    เสร็จสิ้นกิจกรรมแล้ว!
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                        </div>

                        {/* Teacher Notes Section */}
                        {currentProgress && (
                            <div className="mb-8 bg-blue-50 border border-blue-200 p-6 rounded-xl">
                                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    📝 บันทึกของครู
                                </h3>
                                <p className="text-sm text-blue-600 mb-3">
                                    บันทึกข้อสังเกต ความคืบหน้า
                                    หรือข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมนี้
                                </p>
                                <textarea
                                    value={teacherNotes}
                                    onChange={(e) =>
                                        setTeacherNotes(e.target.value)
                                    }
                                    placeholder="พิมพ์บันทึกของคุณที่นี่..."
                                    className="w-full p-4 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={5}
                                />
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={
                                        savingNotes || !teacherNotes.trim()
                                    }
                                    className="mt-3 px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingNotes ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        <>💾 บันทึกโน๊ต</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Progress Indicator */}
                        <div className="mb-8 bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                            <h3 className="text-lg font-bold text-gray-800 mb-8">
                                ความคืบหน้า
                            </h3>
                            <div className="relative">
                                {/* Connecting Line Background */}
                                <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 rounded-full -z-10" />

                                {/* Active Progress Line (Optional - simplistic version based on completed count) */}
                                <div
                                    className="absolute top-4 left-0 h-1 bg-green-400 rounded-full -z-10 transition-all duration-500"
                                    style={{
                                        width: `${(activities.filter((a) => activityProgress.find((p) => p.activityNumber === a.number)?.status === "completed").length / (activities.length - 1)) * 100}%`,
                                    }}
                                />

                                <div className="flex justify-between items-start">
                                    {activities.map((activity) => {
                                        const progress = activityProgress.find(
                                            (p) =>
                                                p.activityNumber ===
                                                activity.number,
                                        );
                                        const isCompleted =
                                            progress?.status === "completed";
                                        const isCurrent =
                                            activity.number ===
                                            currentActivityNumber;
                                        const isLocked =
                                            progress?.status === "locked";

                                        // Determine circle style
                                        let circleClass =
                                            "bg-white border-2 border-gray-300 text-gray-400";
                                        if (isCompleted) {
                                            circleClass =
                                                "bg-green-500 border-green-500 text-white shadow-md shadow-green-200";
                                        } else if (isCurrent) {
                                            const colorMap: Record<
                                                string,
                                                string
                                            > = {
                                                orange: "border-orange-500 text-orange-600 ring-orange-100",
                                                yellow: "border-yellow-400 text-yellow-600 ring-yellow-100",
                                                green: "border-green-500 text-green-600 ring-green-100",
                                            };
                                            const activeStyle =
                                                colorMap[riskLevel] ||
                                                "border-gray-500 text-gray-600 ring-gray-100";
                                            circleClass = `bg-white border-2 ${activeStyle} shadow-md ring-2`;
                                        }

                                        return (
                                            <div
                                                key={activity.id}
                                                className="flex flex-col items-center gap-3 w-1/5 relative group cursor-default"
                                            >
                                                {/* Circle */}
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 z-10 ${circleClass}`}
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : isLocked ? (
                                                        <Lock className="w-4 h-4" />
                                                    ) : (
                                                        activityNumbers.indexOf(
                                                            activity.number,
                                                        ) + 1
                                                    )}
                                                </div>

                                                {/* Label - Show on hover or if current */}
                                                <div
                                                    className={`text-center transition-all duration-300 flex flex-col items-center ${isCurrent ? "scale-105" : "opacity-80 group-hover:opacity-100"}`}
                                                >
                                                    <span
                                                        className={`text-xs font-bold mb-1 ${isCurrent ? "text-gray-800" : "text-gray-500"}`}
                                                    >
                                                        กิจกรรมที่{" "}
                                                        {activityNumbers.indexOf(
                                                            activity.number,
                                                        ) + 1}
                                                    </span>

                                                    {/* Status Badge */}
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 ${
                                                            isCompleted
                                                                ? "bg-green-100 text-green-700"
                                                                : isCurrent
                                                                  ? "bg-yellow-100 text-yellow-700"
                                                                  : "bg-gray-100 text-gray-500"
                                                        }`}
                                                    >
                                                        {isCompleted
                                                            ? "เสร็จแล้ว"
                                                            : isCurrent
                                                              ? "กำลังทำ"
                                                              : "ล็อค"}
                                                    </span>

                                                    <span
                                                        className={`text-[10px] md:text-xs leading-tight line-clamp-2 max-w-[80px] md:max-w-full text-center ${isCurrent ? "text-gray-600 font-medium" : "text-gray-400"}`}
                                                    >
                                                        {activity.title.split(
                                                            ": ",
                                                        )[1] || activity.title}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

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
