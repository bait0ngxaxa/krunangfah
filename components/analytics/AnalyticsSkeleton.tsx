import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Analytics Skeleton Component
 * Loading skeleton for analytics content
 */

export function AnalyticsSkeleton() {
    return (
        <div
            className="space-y-6"
            role="status"
            aria-label="กำลังโหลดหน้าสรุปข้อมูล"
        >
            {/* Tab skeleton */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Fake tab buttons */}
                <div className="mb-6 flex gap-4 border-b border-gray-200 pb-4">
                    <Skeleton className="h-10 w-28 rounded-xl" />
                    <Skeleton className="h-10 w-28 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>

                {/* Fake content grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Fake table */}
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-48 rounded" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-8 w-20 rounded" />
                                <Skeleton className="h-8 flex-1 rounded" />
                                <Skeleton className="h-8 w-16 rounded" />
                            </div>
                        ))}
                    </div>

                    {/* Fake pie chart */}
                    <div className="flex flex-col items-center justify-center">
                        <Skeleton className="mb-6 h-6 w-48 rounded" />
                        <Skeleton className="h-48 w-48 rounded-full" />
                        <div className="flex gap-4 mt-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2"
                                >
                                    <Skeleton className="h-3 w-3 rounded-full" />
                                    <Skeleton className="h-4 w-12 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
