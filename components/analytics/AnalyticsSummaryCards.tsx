import {
    Users,
    CheckCircle,
    Gauge,
    ListChecks,
    Clock3,
    CircleDashed,
    ClipboardList,
    ClipboardX,
    Info,
    type LucideIcon,
} from "lucide-react";
import type { ActivityCompletionSummary } from "@/lib/actions/analytics/types";
import { toSafeCount } from "./utils";

interface AnalyticsSummaryCardsProps {
    totalStudents: number | null;
    studentsWithAssessment: number;
    screeningCoveragePercent: number | null;
    activityAnalyticsApplicable: boolean;
    activityAnalyticsRound: 1 | null;
    activityCompletionSummary: ActivityCompletionSummary | null;
    currentRound?: number;
    currentClass?: string;
}

function MainStudentCard({
    totalStudents,
    currentClass,
}: {
    totalStudents: number | null;
    currentClass?: string;
}) {
    const label = currentClass
        ? `จำนวนนักเรียนตามห้อง ${currentClass}`
        : "จำนวนนักเรียนทั้งหมด";

    return (
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200/80 bg-linear-to-br from-white via-cyan-50/70 to-emerald-50/50 px-6 py-5 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full bg-cyan-200/40 glow-blob-k125" />
            <div className="relative z-10 flex min-h-36 flex-col justify-center gap-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-md ring-1 ring-slate-900/5">
                        <Users
                            className="h-7 w-7 text-cyan-600"
                            aria-hidden="true"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-extrabold leading-snug text-slate-700">
                            {label}
                        </p>
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <p className="text-6xl font-black leading-none tracking-tight text-slate-900">
                        {totalStudents ?? "ไม่มีข้อมูล"}
                    </p>
                    {totalStudents === null ? null : (
                        <p className="pb-1.5 text-base font-extrabold text-cyan-600">
                            คน
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricRow({
    icon: Icon,
    label,
    value,
    unit,
    accentColor,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    unit: string;
    accentColor: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-xl border border-white/80 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/5">
                    <Icon
                        className={`h-5 w-5 ${accentColor}`}
                        aria-hidden="true"
                    />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-600">
                        {label}
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 items-baseline gap-1.5">
                <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {value}
                </p>
                <p className={`text-sm font-bold ${accentColor}`}>{unit}</p>
            </div>
        </div>
    );
}

function ScreeningMetricCard({
    studentsWithAssessment,
    activityCompletionSummary,
    currentRound,
}: {
    studentsWithAssessment: number;
    activityCompletionSummary: Pick<
        ActivityCompletionSummary,
        "requiringActivityStudents" | "notRequiringActivityStudents"
    > | null;
    currentRound?: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-xl border border-white/80 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/5">
                        <CheckCircle
                            className="h-5 w-5 text-emerald-600"
                            aria-hidden="true"
                        />
                    </div>
                    <p className="text-sm font-bold text-slate-600">
                        คัดกรองแล้ว
                    </p>
                </div>
                <div className="flex shrink-0 items-baseline gap-1.5">
                    <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                        {studentsWithAssessment}
                    </p>
                    <p className="text-sm font-bold text-emerald-600">คน</p>
                </div>
            </div>

            {activityCompletionSummary ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    {currentRound === undefined ? (
                        <p className="mb-2 text-xs font-semibold text-slate-500">
                            การแบ่งกลุ่มกิจกรรมอ้างอิงผลคัดกรองครั้งที่ 1
                        </p>
                    ) : null}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                                <ClipboardList
                                    className="h-3.5 w-3.5 shrink-0 text-sky-600"
                                    aria-hidden="true"
                                />
                                <p className="truncate text-xs font-semibold text-slate-500">
                                    ต้องทำกิจกรรม
                                </p>
                            </div>
                            <p className="shrink-0 text-xs font-extrabold text-slate-700">
                                {activityCompletionSummary.requiringActivityStudents} คน
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                                <ClipboardX
                                    className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                    aria-hidden="true"
                                />
                                <p className="truncate text-xs font-semibold text-slate-500">
                                    ไม่ต้องทำกิจกรรม
                                </p>
                            </div>
                            <p className="shrink-0 text-xs font-extrabold text-slate-700">
                                {activityCompletionSummary.notRequiringActivityStudents} คน
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ActivityNotApplicableCard() {
    return (
        <section
            className="relative overflow-hidden rounded-3xl border border-cyan-200/80 bg-linear-to-br from-white via-cyan-50/60 to-sky-50/50 p-5 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.38)]"
            role="status"
        >
            <div className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-cyan-200/35 glow-blob-k112" />
            <div className="relative z-10 flex min-h-36 items-start gap-3">
                <div className="shrink-0 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-sm ring-1 ring-slate-900/5">
                    <Info
                        className="h-6 w-6 text-cyan-600"
                        aria-hidden="true"
                    />
                </div>
                <div className="space-y-1.5">
                    <h2 className="text-sm font-extrabold text-slate-700">
                        การประเมินครั้งที่ 2
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-600">
                        ผลคัดกรองครั้งที่ 2 เป็นการประเมินปลายเทอม จึงไม่มีชุดกิจกรรมต่อจากผลคัดกรองนี้
                    </p>
                </div>
            </div>
        </section>
    );
}

function MetricBlock({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-5 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-200/25 glow-blob-k125" />
            <div className="relative z-10">
                <h2 className="mb-4 text-sm font-extrabold tracking-wide text-slate-700 uppercase">
                    {title}
                </h2>
                <div className="space-y-3">{children}</div>
            </div>
        </section>
    );
}

function PercentageBar({ value }: { value: number }) {
    return (
        <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${value}%` }}
                role="progressbar"
                aria-label="ความครอบคลุมการคัดกรอง"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={value}
            />
        </div>
    );
}

export function AnalyticsSummaryCards({
    totalStudents,
    studentsWithAssessment,
    screeningCoveragePercent,
    activityAnalyticsApplicable,
    activityAnalyticsRound,
    activityCompletionSummary,
    currentRound,
    currentClass,
}: AnalyticsSummaryCardsProps) {
    const safeTotalStudents = totalStudents === null
        ? null
        : toSafeCount(totalStudents);
    const safeStudentsWithAssessment = toSafeCount(studentsWithAssessment);
    const safeActivityCompletionSummary =
        activityAnalyticsApplicable &&
        activityAnalyticsRound === 1 &&
        activityCompletionSummary
            ? {
                  notStartedStudents: toSafeCount(
                      activityCompletionSummary.notStartedStudents,
                  ),
                  inProgressStudents: toSafeCount(
                      activityCompletionSummary.inProgressStudents,
                  ),
                  completedStudents: toSafeCount(
                      activityCompletionSummary.completedStudents,
                  ),
                  requiringActivityStudents: toSafeCount(
                      activityCompletionSummary.requiringActivityStudents,
                  ),
                  notRequiringActivityStudents: toSafeCount(
                      activityCompletionSummary.notRequiringActivityStudents,
                  ),
              }
            : null;
    const coveragePercent = screeningCoveragePercent;

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.6fr)]">
            <MainStudentCard
                totalStudents={safeTotalStudents}
                currentClass={currentClass}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <MetricBlock title="การครอบคลุม">
                    <ScreeningMetricCard
                        studentsWithAssessment={safeStudentsWithAssessment}
                        activityCompletionSummary={safeActivityCompletionSummary}
                        currentRound={currentRound}
                    />
                    <MetricRow
                        icon={Gauge}
                        label="ความครอบคลุมการคัดกรอง"
                        value={coveragePercent ?? 0}
                        unit={coveragePercent === null ? "คำนวณไม่ได้" : "%"}
                        accentColor="text-violet-600"
                    />
                    {coveragePercent === null ? null : (
                        <PercentageBar value={coveragePercent} />
                    )}
                </MetricBlock>

                {safeActivityCompletionSummary ? (
                    <MetricBlock
                        title={
                            currentRound === undefined
                                ? "ผลกิจกรรมจากการคัดกรองครั้งที่ 1"
                                : "ผลกิจกรรม"
                        }
                    >
                        <MetricRow
                            icon={CircleDashed}
                            label="ยังไม่เริ่มทำกิจกรรม"
                            value={safeActivityCompletionSummary.notStartedStudents}
                            unit="คน"
                            accentColor="text-slate-500"
                        />
                        <MetricRow
                            icon={Clock3}
                            label="เริ่มแล้วแต่ยังไม่เสร็จครบ"
                            value={safeActivityCompletionSummary.inProgressStudents}
                            unit="คน"
                            accentColor="text-amber-600"
                        />
                        <MetricRow
                            icon={ListChecks}
                            label="ทำกิจกรรมเสร็จครบแล้ว"
                            value={safeActivityCompletionSummary.completedStudents}
                            unit="คน"
                            accentColor="text-teal-600"
                        />
                    </MetricBlock>
                ) : activityAnalyticsApplicable ? null : (
                    <ActivityNotApplicableCard />
                )}
            </div>
        </div>
    );
}
