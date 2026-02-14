import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 border border-pink-200 ring-1 ring-pink-50">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
                </div>

                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-pink-200 ring-1 ring-pink-50 p-6 animate-pulse"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                                <div>
                                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                                    <div className="h-8 w-16 bg-gray-200 rounded" />
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
