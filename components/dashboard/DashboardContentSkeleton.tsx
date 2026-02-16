/**
 * Skeleton fallback for dashboard content (used by Suspense)
 */
export function DashboardContentSkeleton() {
    return (
        <>
            {/* Header Skeleton */}
            <div className="mb-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-pink-100/50 border border-pink-200">
                <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            </div>

            <div className="space-y-6">
                {/* Teacher Profile Card Skeleton */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg shadow-pink-100/50 border border-pink-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
                        <div className="flex-1">
                            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                    </div>
                </div>

                {/* Action Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-pink-200"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
