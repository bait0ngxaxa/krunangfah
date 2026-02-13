"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Pin } from "lucide-react";

export default function GuidelinesPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const studentId = params.id as string;
    const phqResultId = searchParams.get("phqResultId");
    const startHref = phqResultId
        ? `/students/${studentId}/help/start?phqResultId=${phqResultId}`
        : `/students/${studentId}/help/start`;

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-6 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Link
                    href={startHref}
                    className="group inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-white/80 hover:shadow-sm px-4 py-2 rounded-full border border-transparent hover:border-pink-200 mb-6"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>กลับหน้าใบงาน</span>
                </Link>

                <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-white/60 ring-1 ring-pink-50 overflow-hidden">
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-linear-to-br from-rose-200/25 to-pink-300/20 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-linear-to-br from-pink-200/20 to-rose-300/15 rounded-full blur-xl pointer-events-none" />
                    {/* Shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-pink-300/30 to-transparent" />
                    <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-rose-500 to-pink-500" />

                    {/* Header */}
                    <div className="relative flex items-center gap-4 mb-8">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-rose-400 blur-lg opacity-25" />
                            <div className="relative w-full h-full bg-rose-500 rounded-full flex items-center justify-center text-white text-2xl shadow-inner ring-2 ring-rose-400/30">
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
                        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-xl mb-6">
                            <h3 className="text-rose-800 font-bold mb-2">
                                <span className="flex items-center gap-1.5">
                                    <Pin className="w-4 h-4" /> หมายเหตุ
                                </span>
                            </h3>
                            <p className="text-rose-700 mb-0">
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
                            className="block w-full py-3 bg-linear-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-center"
                        >
                            กลับหน้าใบงาน
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
