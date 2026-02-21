"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

import { BookOpen, Pin } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

export default function GuidelinesPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const studentId = params.id as string;
    const phqResultId = searchParams.get("phqResultId");
    const startHref = phqResultId
        ? `/students/${studentId}/help/start?phqResultId=${phqResultId}`
        : `/students/${studentId}/help/start`;

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4">
            <div className="max-w-4xl mx-auto">
                <BackButton href={startHref} label="กลับหน้าใบงาน" />

                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 md:p-8 border border-emerald-200 ring-1 ring-emerald-50 overflow-hidden">
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-emerald-200/45 to-teal-300/35 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-linear-to-br from-teal-200/20 to-emerald-300/15 rounded-full blur-xl pointer-events-none" />
                    {/* Shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-teal-300/30 to-transparent" />
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-emerald-500 to-teal-500" />

                    {/* Header */}
                    <div className="relative flex items-center gap-4 mb-8">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-emerald-400 blur-lg opacity-25" />
                            <div className="relative w-full h-full bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl shadow-inner ring-2 ring-emerald-400/30">
                                <BookOpen className="w-8 h-8" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                หลักการใช้ใบงาน
                            </h1>
                            <p className="text-gray-600">
                                คำแนะนำในการทำกิจกรรม
                            </p>
                        </div>
                    </div>

                    {/* Content Placeholder */}
                    <div className="prose prose-lg max-w-none">
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-6">
                            <h3 className="text-emerald-800 font-bold mb-2">
                                <span className="flex items-center gap-1.5">
                                    <Pin className="w-4 h-4" /> หมายเหตุ
                                </span>
                            </h3>
                            <p className="text-emerald-700 mb-0">
                                เนื้อหาหลักการใช้ใบงานจะถูกเพิ่มในภายหลัง
                            </p>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            วิธีการใช้ใบงาน
                        </h2>
                        <ol className="space-y-3 text-gray-700">
                            <li>อ่านคำแนะนำในแต่ละกิจกรรมอย่างละเอียด</li>
                            <li>ทำใบงานตามลำดับที่กำหนด</li>
                            <li>ใช้เวลาคิดและสำรวจตัวเองอย่างจริงจัง</li>
                            <li>ปรึกษาครูหากมีข้อสงสัย</li>
                        </ol>
                    </div>

                    {/* Back Button */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <Link
                            href={startHref}
                            className="block w-full py-3 bg-linear-to-r from-emerald-400 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-center"
                        >
                            กลับหน้าใบงาน
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
