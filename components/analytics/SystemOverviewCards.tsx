import { School, Users, CheckCircle } from "lucide-react";
import type { SystemAnalyticsOverview } from "@/lib/actions/analytics/types";

interface SystemOverviewCardsProps {
    overview: SystemAnalyticsOverview;
}

interface OverviewCardProps {
    icon: typeof School;
    label: string;
    value: number;
    unit: string;
    accentColor: string;
    glowColor: string;
}

function OverviewCard({
    icon: Icon,
    label,
    value,
    unit,
    accentColor,
    glowColor,
}: OverviewCardProps) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-cyan-50/40 p-6 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div
                className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl ${glowColor}`}
            />
            <div className="relative z-10 flex items-center gap-4">
                <div className="rounded-2xl border border-white/80 bg-white/85 p-3 shadow-md ring-1 ring-slate-900/5">
                    <Icon className={`h-6 w-6 ${accentColor}`} />
                </div>
                <div>
                    <p className="text-sm font-bold tracking-wide uppercase text-slate-500">
                        {label}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                            {value}
                        </p>
                        <p className={`text-sm font-bold ${accentColor}`}>{unit}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SystemOverviewCards({
    overview,
}: SystemOverviewCardsProps): React.ReactNode {
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-600">
                ภาพรวมระบบ ({overview.academicYearLabel})
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <OverviewCard
                    icon={School}
                    label="โรงเรียนทั้งหมด"
                    value={overview.totalSchools}
                    unit="แห่ง"
                    accentColor="text-cyan-600"
                    glowColor="bg-cyan-200/35"
                />
                <OverviewCard
                    icon={Users}
                    label="นักเรียนทั้งหมด"
                    value={overview.totalStudents}
                    unit="คน"
                    accentColor="text-emerald-600"
                    glowColor="bg-emerald-200/35"
                />
                <OverviewCard
                    icon={CheckCircle}
                    label="ความครอบคลุมคัดกรอง"
                    value={overview.screeningCoveragePercent}
                    unit="%"
                    accentColor="text-violet-600"
                    glowColor="bg-violet-200/35"
                />
            </div>
        </div>
    );
}
