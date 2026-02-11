"use client";

interface AnalyticsSummaryCardsProps {
    totalStudents: number;
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
    currentClass?: string;
}

function SummaryCard({
    icon,
    label,
    value,
    unit,
    borderColor,
    bgColor,
    textColor,
    iconBgColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    unit: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    iconBgColor: string;
}) {
    return (
        <div
            className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border ${borderColor} p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300`}
        >
            <div
                className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}
            />
            <div className="relative flex items-center gap-4">
                <div
                    className={`p-4 ${iconBgColor} rounded-2xl ${textColor} shadow-sm border ${borderColor} group-hover:brightness-95 transition-colors`}
                >
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-bold ${textColor}`}>
                            {value}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
                            {unit}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StudentsIcon = () => (
    <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
    </svg>
);

const CheckIcon = () => (
    <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const WarningIcon = () => (
    <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export function AnalyticsSummaryCards({
    totalStudents,
    studentsWithAssessment,
    studentsWithoutAssessment,
    currentClass,
}: AnalyticsSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
                icon={<StudentsIcon />}
                label={`นักเรียนทั้งหมด${currentClass ? ` (${currentClass})` : ""}`}
                value={totalStudents}
                unit="คน"
                borderColor="border-blue-100"
                bgColor="bg-blue-50"
                textColor="text-blue-600"
                iconBgColor="bg-blue-50"
            />
            <SummaryCard
                icon={<CheckIcon />}
                label="คัดกรองแล้ว"
                value={studentsWithAssessment}
                unit="คน"
                borderColor="border-emerald-100"
                bgColor="bg-emerald-50"
                textColor="text-emerald-600"
                iconBgColor="bg-emerald-50"
            />
            <SummaryCard
                icon={<WarningIcon />}
                label="ยังไม่ได้คัดกรอง"
                value={studentsWithoutAssessment}
                unit="คน"
                borderColor="border-orange-100"
                bgColor="bg-orange-50"
                textColor="text-orange-600"
                iconBgColor="bg-orange-50"
            />
        </div>
    );
}
