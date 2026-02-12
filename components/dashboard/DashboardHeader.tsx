interface DashboardHeaderProps {
    teacherName: string;
    schoolName: string;
}

export function DashboardHeader({
    teacherName,
    schoolName,
}: DashboardHeaderProps) {
    return (
        <div className="relative mb-12 py-10 px-6 rounded-3xl overflow-hidden text-center mx-auto max-w-5xl">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-linear-to-br from-rose-50/80 via-white/50 to-pink-50/80 backdrop-blur-sm -z-10" />
            <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-linear-to-tr from-rose-200/30 via-pink-200/30 to-orange-100/30 rounded-full blur-[100px] animate-float-slow -z-10" />
            <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[150%] bg-linear-to-bl from-blue-100/30 via-purple-100/30 to-pink-100/30 rounded-full blur-[100px] animate-float-delayed -z-10" />

            <div className="relative z-10 flex flex-col items-center">
                {/* Icon Wrapper with Glow */}
                <div className="relative mb-6 group cursor-default">
                    <div className="absolute -inset-4 bg-linear-to-r from-rose-300/50 to-pink-300/50 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative bg-white/60 backdrop-blur-xl p-4 rounded-3xl shadow-lg ring-1 ring-white/60 transform transition-transform duration-500 hover:scale-110 hover:rotate-12">
                        <span className="text-5xl drop-shadow-sm select-none animate-fairy-fly">
                            🧚‍♀️
                        </span>
                    </div>
                </div>

                {/* Main Greeting */}
                <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight drop-shadow-sm">
                    <span className="bg-clip-text text-transparent bg-linear-to-r from-rose-500 via-pink-500 to-rose-400 animate-gradient-x">
                        สวัสดีคุณครูนางฟ้า
                    </span>
                </h1>

                {/* Sparkle Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="sparkle-dot" />
                    <div className="h-px w-12 bg-linear-to-r from-transparent via-pink-300 to-transparent" />
                    <span className="sparkle-dot" />
                    <div className="h-px w-12 bg-linear-to-r from-transparent via-rose-300 to-transparent" />
                    <span className="sparkle-dot" />
                </div>

                {/* Info Card */}
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/70 backdrop-blur-md rounded-full shadow-sm border border-white/80 ring-2 ring-pink-50/50 hover:bg-white/90 hover:shadow-md transition-all duration-300 group">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse group-hover:bg-emerald-500" />
                    <p className="text-lg font-medium text-slate-600">
                        <span className="font-bold text-slate-800">
                            {teacherName}
                        </span>
                        <span className="mx-3 text-pink-200">|</span>
                        <span className="text-slate-600">{schoolName}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
