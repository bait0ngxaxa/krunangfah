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
            className="relative flex items-center justify-center overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-8 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]"
            style={{ height }}
        >
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="relative z-10 animate-pulse text-gray-400">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
                <p className="text-center">Loading chart...</p>
            </div>
        </div>
    );
}

// Dynamic imports with loading states
export const RiskLevelTrendChart = dynamic(
    () =>
        import("./RiskLevelTrendChart").then((mod) => mod.RiskLevelTrendChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton height={400} />,
    },
);

export const RiskLevelByGradeChart = dynamic(
    () =>
        import("./RiskLevelByGradeChart").then(
            (mod) => mod.RiskLevelByGradeChart,
        ),
    {
        ssr: false,
        loading: () => <ChartSkeleton height={400} />,
    },
);
