import { DashboardContentSkeleton } from "@/components/dashboard";

export default function Loading() {
    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-100 py-6 px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <DashboardContentSkeleton />
            </div>
        </div>
    );
}
