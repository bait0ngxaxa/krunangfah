export default function Loading() {
    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Back Button Skeleton */}
                <div className="h-9 w-36 bg-gray-200 rounded-full animate-pulse mb-4" />

                <div className="space-y-6">
                    {/* Profile Card Skeleton */}
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 border border-emerald-200 ring-1 ring-emerald-50">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
                            <div className="flex-1">
                                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                                <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="h-16 bg-gray-100 rounded-xl animate-pulse"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Tabs Skeleton */}
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 border border-emerald-200 ring-1 ring-emerald-50">
                        <div className="flex gap-4 mb-6">
                            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-16 bg-gray-100 rounded-xl animate-pulse"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
