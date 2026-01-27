import { getServerSession } from "@/lib/auth";

interface DashboardHeaderProps {
    teacherName: string;
    schoolName: string;
}

export function DashboardHeader({
    teacherName,
    schoolName,
}: DashboardHeaderProps) {
    return (
        <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                สวัสดีคุณครูนางฟ้า
            </h1>
            <div className="inline-block bg-yellow-200 px-6 py-2 rounded-lg">
                <p className="text-lg font-semibold text-gray-800">
                    {teacherName} {schoolName}
                </p>
            </div>
        </div>
    );
}
