import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
    return (
        <div
            className="min-h-screen bg-slate-50 px-4 py-12"
            role="status"
            aria-label="กำลังโหลดหน้าตั้งค่า"
        >
            <div className="max-w-4xl mx-auto">
                {/* Header Skeleton */}
                <div className="mb-8 rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
                    <Skeleton className="mb-2 h-8 w-1/3 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                </div>

                {/* Content Skeleton */}
                <div className="rounded-2xl border-2 border-gray-100 bg-white p-8 shadow-sm">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full rounded" />
                        <Skeleton className="h-10 w-full rounded" />
                        <Skeleton className="h-10 w-full rounded" />
                        <Skeleton className="h-10 w-2/3 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
