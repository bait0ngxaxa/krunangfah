/**
 * Analytics Skeleton Component
 * Loading skeleton for analytics content
 */

"use client";

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Tab skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {/* Fake tab buttons */}
                <div className="flex gap-4 mb-6 border-b pb-4">
                    <div className="h-10 w-28 bg-gray-200 rounded-lg" />
                    <div className="h-10 w-28 bg-gray-200 rounded-lg" />
                    <div className="h-10 w-32 bg-gray-200 rounded-lg" />
                </div>

                {/* Fake content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fake table */}
                    <div className="space-y-3">
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="h-8 w-20 bg-gray-100 rounded" />
                                <div className="h-8 flex-1 bg-gray-100 rounded" />
                                <div className="h-8 w-16 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>

                    {/* Fake pie chart */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
                        <div className="w-48 h-48 bg-gray-200 rounded-full" />
                        <div className="flex gap-4 mt-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2"
                                >
                                    <div className="w-3 h-3 bg-gray-200 rounded-full" />
                                    <div className="h-4 w-12 bg-gray-200 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
