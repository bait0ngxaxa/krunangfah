"use client";

/**
 * Dynamic Import Wrappers for Analytics Charts
 * Reduces initial bundle by lazy loading heavy chart components
 */

import dynamic from "next/dynamic";

// Skeleton component for charts
function ChartSkeleton({ height = 400 }: { height?: number }) {
    return (
        <div
            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 border border-white/60 ring-1 ring-pink-50 p-8 flex items-center justify-center"
            style={{ height }}
        >
            <div className="animate-pulse text-gray-400">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
                <p className="text-center">กำลังโหลดกราฟ...</p>
            </div>
        </div>
    );
}

// Dynamic imports with loading states
export const RiskLevelTrendChart = dynamic(
    () => import("./RiskLevelTrendChart").then((mod) => mod.RiskLevelTrendChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton height={400} />,
    }
);

export const RiskLevelByGradeChart = dynamic(
    () =>
        import("./RiskLevelByGradeChart").then(
            (mod) => mod.RiskLevelByGradeChart
        ),
    {
        ssr: false,
        loading: () => <ChartSkeleton height={400} />,
    }
);
