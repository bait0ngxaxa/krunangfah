"use client";

import { useState } from "react";
import { Calendar, User, Trash2, CalendarClock, ImageIcon } from "lucide-react";
import type { HomeVisitData, HomeVisitPhotoData } from "@/lib/actions/home-visit.actions";
import { deleteHomeVisit } from "@/lib/actions/home-visit.actions";
import { HomeVisitPhotoViewer } from "./HomeVisitPhotoViewer";
import { toast } from "sonner";

interface HomeVisitCardProps {
    visit: HomeVisitData;
    readOnly?: boolean;
    onDeleted: () => void;
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function HomeVisitCard({
    visit,
    readOnly = false,
    onDeleted,
}: HomeVisitCardProps) {
    const [deleting, setDeleting] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    const handleDelete = async () => {
        if (!confirm("ต้องการลบบันทึกการเยี่ยมบ้านนี้หรือไม่? รูปภาพทั้งหมดจะถูกลบด้วย")) {
            return;
        }

        setDeleting(true);
        const result = await deleteHomeVisit(visit.id);

        if (result.success) {
            toast.success("ลบบันทึกการเยี่ยมบ้านสำเร็จ");
            onDeleted();
        } else {
            toast.error(result.message || "เกิดข้อผิดพลาด");
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-emerald-50/80 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full">
                        ครั้งที่ {visit.visitNumber}
                    </span>
                    <span className="text-sm text-gray-600 font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        {formatDate(visit.visitDate)}
                    </span>
                </div>

                {!readOnly && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="ลบบันทึก"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                {/* Teacher info */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">{visit.teacherName}</span>
                    <span className="text-gray-400">({visit.teacherRole})</span>
                </div>

                {/* Description */}
                <div>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {visit.description}
                    </p>
                </div>

                {/* Photos grid */}
                {visit.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {visit.photos.map((photo: HomeVisitPhotoData, index: number) => (
                            <div
                                key={photo.id}
                                className="relative aspect-square rounded-xl overflow-hidden border border-emerald-100 cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all"
                                onClick={() => setViewerIndex(index)}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photo.fileUrl}
                                    alt={photo.fileName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {visit.photos.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <ImageIcon className="w-4 h-4" />
                        ไม่มีรูปภาพ
                    </div>
                )}

                {/* Next scheduled date */}
                {visit.nextScheduledDate && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <CalendarClock className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">
                            นัดครั้งถัดไป: {formatDate(visit.nextScheduledDate)}
                        </span>
                    </div>
                )}
            </div>

            {/* Full-screen viewer */}
            {viewerIndex !== null && (
                <HomeVisitPhotoViewer
                    photos={visit.photos}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                />
            )}
        </div>
    );
}
