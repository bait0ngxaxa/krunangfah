"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Plus, MapPin } from "lucide-react";
import type { HomeVisitData } from "@/lib/actions/home-visit.actions";
import { HomeVisitCard } from "./HomeVisitCard";
import { AddHomeVisitModal } from "./AddHomeVisitModal";
import { Button } from "@/components/ui/Button";

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
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm transition-base duration-300 hover:shadow-md md:p-8">
            {/* Corner decoration */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-100/45 blur-3xl" />

            <h2 className="relative text-2xl font-bold mb-6 flex items-center gap-2">
                <Home className="w-6 h-6 text-emerald-500" />
                <span className="text-gray-800">
                    บันทึกการเยี่ยมบ้าน
                </span>
                {visits.length > 0 && (
                    <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-sm font-bold text-emerald-700">
                        {visits.length} ครั้ง
                    </span>
                )}
            </h2>

            {/* Visit list */}
            {visits.length === 0 ? (
                <div className="p-6 sm:p-12 text-center bg-white/50 rounded-xl border border-gray-100">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <MapPin className="w-10 h-10 text-gray-400" />
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
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="primary"
                        size="lg"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มบันทึกการเยี่ยมบ้าน
                    </Button>
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
