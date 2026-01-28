interface DashboardHeaderProps {
    teacherName: string;
    schoolName: string;
}

export function DashboardHeader({
    teacherName,
    schoolName,
}: DashboardHeaderProps) {
    return (
        <div className="text-center mb-10 relative z-10">
            <h1 className="text-3xl md:text-5xl font-bold bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-4 drop-shadow-sm">
                สวัสดีคุณครูนางฟ้า 🧚‍♀️
            </h1>
            <div className="inline-block bg-white/60 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm border border-white">
                <p className="text-lg font-bold text-gray-700">
                    {teacherName} <span className="text-pink-300 mx-2">|</span>{" "}
                    {schoolName}
                </p>
            </div>
        </div>
    );
}
