import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div
            className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6"
            role="status"
            aria-label="กำลังโหลดรายละเอียดนักเรียน"
        >
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Back Button Skeleton */}
                <Skeleton className="mb-4 h-9 w-36 rounded-full" />

                <div className="space-y-6">
                    {/* Profile Card Skeleton */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                        <div className="flex items-center gap-4 mb-4">
                            <Skeleton className="h-16 w-16 rounded-2xl" />
                            <div className="flex-1">
                                <Skeleton className="mb-2 h-6 w-40 rounded" />
                                <Skeleton className="h-4 w-56 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-16 rounded-xl"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Tabs Skeleton */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                        <div className="flex gap-4 mb-6">
                            <Skeleton className="h-10 w-32 rounded-lg" />
                            <Skeleton className="h-10 w-40 rounded-lg" />
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-16 rounded-xl"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
