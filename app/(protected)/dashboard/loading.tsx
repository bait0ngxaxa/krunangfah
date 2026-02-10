export default function Loading() {
    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-100 py-8 px-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header Skeleton */}
                <div className="mb-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg shadow-pink-100/50 border border-white/60">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-3" />
                    <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                </div>

                <div className="space-y-6">
                    {/* Teacher Profile Card Skeleton */}
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg shadow-pink-100/50 border border-white/60">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
                            <div className="flex-1">
                                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                                <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                        </div>
                    </div>

                    {/* Action Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/60"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
                                    <div className="flex-1">
                                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
