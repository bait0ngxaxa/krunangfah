import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton fallback for dashboard content (used by Suspense)
 */
export function DashboardContentSkeleton() {
    return (
        <div
            className="min-h-screen bg-slate-50"
            role="status"
            aria-label="กำลังโหลดแดชบอร์ด"
        >
            <div className="relative overflow-hidden bg-white">
                <div className="mx-auto flex min-h-[220px] max-w-4xl items-end px-4 pb-8 pt-10 sm:px-6 lg:px-8">
                    <div className="w-full space-y-4">
                        <Skeleton className="h-10 w-64 max-w-[78%] rounded-2xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-80 max-w-[88%] rounded" />
                            <Skeleton className="h-4 w-56 max-w-[70%] rounded" />
                        </div>
                        <Skeleton className="h-9 w-32 rounded-full" />
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="space-y-5">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-6 w-44 max-w-full rounded" />
                                <Skeleton className="h-4 w-64 max-w-full rounded" />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[1, 2, 3].map((item) => (
                                <Skeleton
                                    key={item}
                                    className="h-20 rounded-xl"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-5 w-32 rounded" />
                                    <Skeleton className="h-4 w-48 max-w-full rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
