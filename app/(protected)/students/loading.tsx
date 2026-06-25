import { StudentDashboardSkeleton } from "@/components/student/dashboard/StudentDashboardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div
            className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8"
            role="status"
            aria-label="กำลังโหลดหน้านักเรียน"
        >
            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header Skeleton */}
                <div className="mb-6">
                    <Skeleton className="h-10 w-48 rounded-full" />
                </div>

                <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100">
                    <div>
                        <Skeleton className="mb-2 h-8 w-48 rounded" />
                        <Skeleton className="h-4 w-64 rounded" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-full" />
                </div>

                {/* Dashboard Skeleton */}
                <StudentDashboardSkeleton />
            </div>
        </div>
    );
}
