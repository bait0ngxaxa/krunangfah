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
            <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-sm py-2 leading-tight text-gray-800">
                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                    สวัสดีคุณครูนางฟ้า
                </span>{" "}
                🧚‍♀️
            </h1>
            <div className="inline-block bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-sm shadow-pink-100 border border-pink-100">
                <p className="text-lg font-bold text-gray-700">
                    {teacherName} <span className="text-pink-300 mx-2">|</span>{" "}
                    {schoolName}
                </p>
            </div>
        </div>
    );
}
