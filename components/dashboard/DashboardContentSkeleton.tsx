/**
 * Skeleton fallback for dashboard content (used by Suspense)
 */
export function DashboardContentSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="relative overflow-hidden bg-white">
                <div className="mx-auto flex min-h-[220px] max-w-4xl items-end px-4 pb-8 pt-10 sm:px-6 lg:px-8">
                    <div className="w-full animate-pulse space-y-4">
                        <div className="h-10 w-64 max-w-[78%] rounded-2xl bg-slate-200" />
                        <div className="space-y-2">
                            <div className="h-4 w-80 max-w-[88%] rounded bg-slate-100" />
                            <div className="h-4 w-56 max-w-[70%] rounded bg-slate-100" />
                        </div>
                        <div className="h-9 w-32 rounded-full bg-emerald-100" />
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="animate-pulse space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-6 w-44 max-w-full rounded bg-slate-200" />
                                <div className="h-4 w-64 max-w-full rounded bg-slate-100" />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-20 rounded-xl bg-slate-100"
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
                            <div className="flex animate-pulse items-center gap-4">
                                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="h-5 w-32 rounded bg-slate-200" />
                                    <div className="h-4 w-48 max-w-full rounded bg-slate-100" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
