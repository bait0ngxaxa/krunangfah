import { StudentDashboardSkeleton } from "@/components/student";

export default function Loading() {
    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header Skeleton */}
                <div className="mb-6">
                    <div className="h-10 w-48 bg-gray-200 rounded-full animate-pulse" />
                </div>

                <div className="flex justify-between items-center mb-8 bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
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
