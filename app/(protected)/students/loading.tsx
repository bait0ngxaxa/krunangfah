import { StudentDashboardSkeleton } from "@/components/student/dashboard/StudentDashboardSkeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 relative overflow-hidden">
            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header Skeleton */}
                <div className="mb-6">
                    <div className="h-10 w-48 bg-gray-200 rounded-full animate-pulse" />
                </div>

                <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
                </div>

                {/* Dashboard Skeleton */}
                <StudentDashboardSkeleton />
            </div>
        </div>
    );
}
