"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Plus, MapPin } from "lucide-react";
import type { HomeVisitData } from "@/lib/actions/home-visit.actions";
import { HomeVisitCard } from "./HomeVisitCard";
import { AddHomeVisitModal } from "./AddHomeVisitModal";

interface HomeVisitTabProps {
    visits: HomeVisitData[];
    studentId: string;
    readOnly?: boolean;
}

export function HomeVisitTab({
    visits,
    studentId,
    readOnly = false,
}: HomeVisitTabProps) {
    const router = useRouter();
    const [showAddModal, setShowAddModal] = useState(false);

    const handleSuccess = () => {
        router.refresh();
    };

    return (
        <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 md:p-8 border border-emerald-200 ring-1 ring-emerald-50 overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-300 via-teal-300 to-cyan-300" />
            {/* Corner decoration */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-linear-to-br from-emerald-200/45 to-teal-300/35 rounded-full blur-xl pointer-events-none" />
            {/* Shimmer */}
            <div className="absolute inset-x-0 top-[6px] h-px bg-linear-to-r from-transparent via-emerald-300/30 to-transparent" />

            <h2 className="relative text-2xl font-bold mb-6 flex items-center gap-2">
                <Home className="w-6 h-6 text-emerald-500" />
                <span className="bg-linear-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    บันทึกการเยี่ยมบ้าน
                </span>
                {visits.length > 0 && (
                    <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                        {visits.length} ครั้ง
                    </span>
                )}
            </h2>

            {/* Visit list */}
            {visits.length === 0 ? (
                <div className="p-12 text-center bg-white/50 rounded-xl border border-emerald-100">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                        <MapPin className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                        ยังไม่มีบันทึกการเยี่ยมบ้าน
                    </h3>
                    <p className="text-gray-500 mb-6 font-medium">
                        เริ่มต้นบันทึกการเยี่ยมบ้านเพื่อติดตามสภาพความเป็นอยู่ของนักเรียน
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visits.map((visit) => (
                        <HomeVisitCard
                            key={visit.id}
                            visit={visit}
                            readOnly={readOnly}
                            onDeleted={handleSuccess}
                        />
                    ))}
                </div>
            )}

            {/* Add Button */}
            {!readOnly && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-linear-to-r from-emerald-400 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/50 hover:-translate-y-0.5 transition-all font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-200/50"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มบันทึกการเยี่ยมบ้าน
                    </button>
                </div>
            )}

            {/* Add Modal */}
            {!readOnly && showAddModal && (
                <AddHomeVisitModal
                    studentId={studentId}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
