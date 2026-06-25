import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Student Dashboard Skeleton
 * Loading skeleton for student dashboard
 */

export function StudentDashboardSkeleton() {
    return (
        <div
            className="space-y-6"
            role="status"
            aria-label="กำลังโหลดแดชบอร์ดนักเรียน"
        >
            {/* Class filter skeleton */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <Skeleton className="mb-2 h-4 w-24 rounded" />
                <Skeleton className="h-10 w-64 rounded-lg" />
            </div>

            {/* Pie chart skeleton */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <Skeleton className="mx-auto mb-6 h-6 w-48 rounded" />
                <div className="flex justify-center">
                    <Skeleton className="h-48 w-48 rounded-full" />
                </div>
                <div className="flex justify-center gap-4 mt-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3 rounded-full" />
                            <Skeleton className="h-4 w-12 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Student groups skeleton */}
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
                <Skeleton className="h-6 w-64 rounded" />
            </div>

            {/* Risk group cards skeleton */}
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="bg-white rounded-xl shadow-md p-4 space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-5 w-32 rounded" />
                        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[1, 2].map((j) => (
                            <Skeleton key={j} className="h-16 rounded-lg" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
