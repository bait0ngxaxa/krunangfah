import { Users, CheckCircle, AlertCircle, type LucideIcon } from "lucide-react";

interface AnalyticsSummaryCardsProps {
    totalStudents: number;
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
    currentClass?: string;
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    unit,
    glowColor,
    accentColor,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    unit: string;
    glowColor: string;
    accentColor: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-6 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-24px_rgba(15,23,42,0.5)]">
            <div
                className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl ${glowColor}`}
            />
            <div className="relative z-10 flex items-center gap-5">
                <div className="relative shrink-0">
                    <div className="rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-md ring-1 ring-slate-900/5">
                        <Icon className={`h-6 w-6 ${accentColor}`} />
                    </div>
                </div>
                <div>
                    <p className="mb-1 text-sm font-bold tracking-wide text-slate-500 uppercase">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                            {value}
                        </p>
                        <p className={`text-sm font-bold ${accentColor}`}>
                            {unit}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AnalyticsSummaryCards({
    totalStudents,
    studentsWithAssessment,
    studentsWithoutAssessment,
    currentClass,
}: AnalyticsSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
                icon={Users}
                label={`นักเรียนทั้งหมด${currentClass ? ` (${currentClass})` : ""}`}
                value={totalStudents}
                unit="คน"
                glowColor="bg-cyan-200/35"
                accentColor="text-cyan-600"
            />
            <SummaryCard
                icon={CheckCircle}
                label="คัดกรองแล้ว"
                value={studentsWithAssessment}
                unit="คน"
                glowColor="bg-emerald-200/35"
                accentColor="text-emerald-600"
            />
            <SummaryCard
                icon={AlertCircle}
                label="ยังไม่ได้คัดกรอง"
                value={studentsWithoutAssessment}
                unit="คน"
                glowColor="bg-amber-200/35"
                accentColor="text-amber-600"
            />
        </div>
    );
}
