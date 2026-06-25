import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div
            className="min-h-screen bg-slate-50 px-4 py-8"
            role="status"
            aria-label="กำลังโหลดหน้าสรุปข้อมูล"
        >
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                    <Skeleton className="mb-2 h-8 w-64 rounded" />
                    <Skeleton className="h-4 w-96 rounded" />
                </div>

                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6"
                        >
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-14 w-14 rounded-lg" />
                                <div>
                                    <Skeleton className="mb-2 h-4 w-24 rounded" />
                                    <Skeleton className="h-8 w-16 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Analytics Content Skeleton */}
                <AnalyticsSkeleton />
            </div>
        </div>
    );
}
