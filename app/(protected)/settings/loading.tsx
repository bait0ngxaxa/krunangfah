export default function SettingsLoading() {
    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 px-4 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header Skeleton */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 p-6 mb-8 animate-pulse">
                    <div className="h-8 bg-emerald-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-emerald-100 rounded w-1/2" />
                </div>

                {/* Content Skeleton */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 border border-emerald-200 p-8 animate-pulse">
                    <div className="space-y-4">
                        <div className="h-10 bg-emerald-100 rounded w-full" />
                        <div className="h-10 bg-emerald-100 rounded w-full" />
                        <div className="h-10 bg-emerald-100 rounded w-full" />
                        <div className="h-10 bg-emerald-100 rounded w-2/3" />
                    </div>
                </div>
            </div>
        </div>
    );
}
