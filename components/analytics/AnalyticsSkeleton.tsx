/**
 * Analytics Skeleton Component
 * Loading skeleton for analytics content
 */

"use client";

export function AnalyticsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Tab skeleton */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 p-6">
                {/* Fake tab buttons */}
                <div className="flex gap-4 mb-6 border-b border-gray-100 pb-4">
                    <div className="h-10 w-28 bg-gray-100 rounded-xl" />
                    <div className="h-10 w-28 bg-gray-100 rounded-xl" />
                    <div className="h-10 w-32 bg-gray-100 rounded-xl" />
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
