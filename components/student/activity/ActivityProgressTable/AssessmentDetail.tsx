import { AlertTriangle, ClipboardList, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { ActivityProgress } from "./types";

type ProblemSide = "internal" | "external";

interface AssessmentProblemCardProps {
    side: ProblemSide;
    points: string[];
    isMain: boolean;
}

interface ProblemCardConfig {
    title: string;
    description: string;
    icon: ReactNode;
    cardClass: string;
    bulletClass: string;
}

function isInternalProblemType(problemType: string): boolean {
    return problemType === "internal" || problemType === "INTERNAL";
}

function ProblemTypeBadge({ problemType }: { problemType: string }) {
    const isInternal = isInternalProblemType(problemType);

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                isInternal
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
        >
            {isInternal ? (
                <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
                <ExternalLink className="h-3.5 w-3.5" />
            )}
            ปัญหาหลัก: {isInternal ? "ภายใน" : "ภายนอก"}
        </span>
    );
}

function toProblemPoints(text: string): string[] {
    return text
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

function getProblemCardConfig(side: ProblemSide): ProblemCardConfig {
    if (side === "internal") {
        return {
            title: "ปัญหาภายใน",
            description:
                "ความคิด ความรู้สึก หรือความกังวลที่เกิดขึ้นกับตัวนักเรียน",
            icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
            cardClass: "border-amber-200 bg-amber-50/80",
            bulletClass: "bg-amber-500",
        };
    }

    return {
        title: "ปัญหาภายนอก",
        description: "สภาพแวดล้อม ความสัมพันธ์ หรือสถานการณ์รอบตัวนักเรียน",
        icon: <ExternalLink className="h-4 w-4 text-blue-600" />,
        cardClass: "border-blue-200 bg-blue-50/80",
        bulletClass: "bg-blue-500",
    };
}

function ProblemPointList({
    points,
    bulletClass,
}: {
    points: string[];
    bulletClass: string;
}) {
    return (
        <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
            {points.map((point) => (
                <li key={point} className="flex gap-2">
                    <span
                        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClass}`}
                    />
                    <span>{point}</span>
                </li>
            ))}
        </ul>
    );
}

function AssessmentProblemCard({
    side,
    points,
    isMain,
}: AssessmentProblemCardProps) {
    const config = getProblemCardConfig(side);

    return (
        <div
            className={`rounded-xl border p-4 ${config.cardClass} ${
                isMain ? "ring-2 ring-slate-900/10" : ""
            }`}
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-lg bg-white/80 p-1.5">
                        {config.icon}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">
                                {config.title}
                            </span>
                            {isMain && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-gray-700">
                                    ปัญหาหลัก
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                            {config.description}
                        </p>
                    </div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600">
                    {points.length} ประเด็น
                </span>
            </div>
            <ProblemPointList
                points={points}
                bulletClass={config.bulletClass}
            />
        </div>
    );
}

function AssessmentHeader({ problemType }: { problemType: string | null }) {
    return (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                    <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            กิจกรรมที่ 1
                        </span>
                        <span className="text-sm font-bold text-gray-800">
                            สรุปผลการประเมินปัญหา
                        </span>
                    </div>
                </div>
            </div>
            {problemType && (
                <div className="shrink-0">
                    <ProblemTypeBadge problemType={problemType} />
                </div>
            )}
        </div>
    );
}

export function AssessmentDetail({ progress }: { progress: ActivityProgress }) {
    const internalPoints = progress.internalProblems
        ? toProblemPoints(progress.internalProblems)
        : [];
    const externalPoints = progress.externalProblems
        ? toProblemPoints(progress.externalProblems)
        : [];
    const mainSide = progress.problemType
        ? isInternalProblemType(progress.problemType)
            ? "internal"
            : "external"
        : null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-white p-4 shadow-sm">
            <AssessmentHeader problemType={progress.problemType} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {internalPoints.length > 0 && (
                    <AssessmentProblemCard
                        side="internal"
                        points={internalPoints}
                        isMain={mainSide === "internal"}
                    />
                )}
                {externalPoints.length > 0 && (
                    <AssessmentProblemCard
                        side="external"
                        points={externalPoints}
                        isMain={mainSide === "external"}
                    />
                )}
            </div>
        </div>
    );
}
