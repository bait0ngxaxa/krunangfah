/**
 * Student Dashboard Skeleton
 * Loading skeleton for student dashboard
 */

export function StudentDashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Class filter skeleton */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-64 bg-gray-200 rounded-lg" />
            </div>

            {/* Pie chart skeleton */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-6" />
                <div className="flex justify-center">
                    <div className="w-48 h-48 bg-gray-200 rounded-full" />
                </div>
                <div className="flex justify-center gap-4 mt-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-200 rounded-full" />
                            <div className="h-4 w-12 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Student groups skeleton */}
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-100 shadow-sm">
                <div className="h-6 w-64 bg-gray-200 rounded" />
            </div>

            {/* Risk group cards skeleton */}
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="bg-white rounded-xl shadow-md p-4 space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-gray-200 rounded" />
                        <div className="h-5 w-32 bg-gray-200 rounded" />
                        <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[1, 2].map((j) => (
                            <div
                                key={j}
                                className="h-16 bg-gray-100 rounded-lg"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
