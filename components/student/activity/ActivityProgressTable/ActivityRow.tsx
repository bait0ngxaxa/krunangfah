import { CheckCircle2, Lock, AlertTriangle, ExternalLink } from "lucide-react";
import { getActivityName } from "./utils";
import { WorksheetPreviewButton } from "../WorksheetPreviewButton";
import { ScheduleDateCell } from "./ScheduleDateCell";
import type { ActivityProgress } from "./types";

interface ActivityRowProps {
    progress: ActivityProgress;
    index: number;
    readOnly?: boolean;
}

function ProblemTypeBadge({ problemType }: { problemType: string }) {
    const isInternal = problemType === "internal" || problemType === "INTERNAL";
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${
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
            {isInternal ? "ปัญหาภายใน" : "ปัญหาภายนอก"}
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

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === "completed";
    const isLocked = status === "locked";

    const badgeClass = isCompleted
        ? "bg-green-50 text-green-700 border border-green-200"
        : isLocked
          ? "bg-gray-50 text-gray-500 border border-gray-200"
          : "bg-yellow-50 text-yellow-700 border border-yellow-200";

    const label = isCompleted ? "เสร็จแล้ว" : isLocked ? "ล็อค" : "กำลังทำ";

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${badgeClass}`}
        >
            {isCompleted && <CheckCircle2 className="w-3 h-3" />}
            {label}
        </span>
    );
}

export function ActivityRow({ progress, index, readOnly = false }: ActivityRowProps) {
    const isLocked = progress.status === "locked";
    const isCompleted = progress.status === "completed";
    const activityName = getActivityName(progress.activityNumber);
    const hasAssessment = progress.activityNumber === 1 && Boolean(
        progress.internalProblems || progress.externalProblems,
    );

    const iconBgColor = isLocked
        ? "bg-gray-100 text-gray-400"
        : isCompleted
          ? "bg-green-100 text-green-600"
          : "bg-emerald-100 text-emerald-600";

    return (
        <>
            <tr
                className={`
                    block md:table-row
                    bg-white md:bg-transparent
                    border border-gray-200 md:border-none rounded-2xl md:rounded-none
                    p-5 md:p-0
                    mb-4 md:mb-0
                    shadow-sm md:shadow-none
                    hover:bg-slate-50/80 transition-colors
                    ${isLocked ? "opacity-60 grayscale" : ""}
                `}
            >
                {/* Column 1: Activity Name */}
                <td className="block md:table-cell md:px-6 md:py-5 mb-4 md:mb-0">
                    <div className="flex items-center gap-4">
                        <span
                            className={`w-10 h-10 md:w-8 md:h-8 ${iconBgColor} rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm transition-transform hover:scale-110`}
                        >
                            {isLocked ? (
                                <Lock className="w-5 h-5 md:w-4 md:h-4" />
                            ) : isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4" />
                            ) : (
                                index + 1
                            )}
                        </span>
                        <div className="flex-1 md:flex-none">
                            <span
                                className={`font-bold block text-lg md:text-sm ${
                                    isLocked ? "text-gray-400" : "text-gray-800"
                                }`}
                            >
                                {activityName}
                            </span>
                            {/* Mobile: Show status badge inline */}
                            <div className="md:hidden mt-2">
                                <StatusBadge status={progress.status} />
                            </div>
                        </div>
                    </div>
                </td>

                {/* Column 2: Scheduled Date */}
                <td className="block md:table-cell md:px-6 md:py-5 mb-2 md:mb-0">
                    <div className="flex items-center justify-between md:block">
                        <span className="font-medium md:hidden text-gray-500 text-sm">
                            วันที่:{" "}
                        </span>
                        <ScheduleDateCell
                            activityProgressId={progress.id}
                            currentDate={progress.scheduledDate}
                            isLocked={isLocked}
                            readOnly={readOnly}
                        />
                    </div>
                </td>

                {/* Column 3: Teacher */}
                <td className="block md:table-cell md:px-6 md:py-5 mb-4 md:mb-0">
                    <div className="flex items-center justify-between md:block">
                        <span className="font-medium md:hidden text-gray-500 text-sm">
                            ครู:{" "}
                        </span>
                        <span className="text-gray-700 text-sm">
                            {progress.teacher?.teacher
                                ? `${progress.teacher.teacher.firstName} ${progress.teacher.teacher.lastName}`
                                : "-"}
                        </span>
                    </div>
                </td>

                {/* Column 4: Status / Action */}
                <td className="block md:table-cell md:px-6 md:py-5 md:text-center border-t border-gray-100 md:border-none pt-4 md:pt-0">
                    {/* Desktop: Show status badge or preview button */}
                    <div className="hidden md:flex justify-center">
                        {isLocked ? (
                            <StatusBadge status={progress.status} />
                        ) : (
                            <WorksheetPreviewButton
                                uploads={progress.worksheetUploads}
                                isCompleted={isCompleted}
                                activityNumber={progress.activityNumber}
                            />
                        )}
                    </div>

                    {/* Mobile: Show preview button if completed */}
                    {!isLocked &&
                        isCompleted &&
                        progress.worksheetUploads.length > 0 && (
                            <div className="md:hidden flex justify-end">
                                <WorksheetPreviewButton
                                    uploads={progress.worksheetUploads}
                                    isCompleted={isCompleted}
                                    activityNumber={progress.activityNumber}
                                />
                            </div>
                        )}

                    {/* Mobile: Show assessment detail inline */}
                    {hasAssessment && (
                        <div className="md:hidden mt-4 border-t border-gray-100 pt-3">
                            <AssessmentDetail progress={progress} />
                        </div>
                    )}
                </td>
            </tr>

            {/* Desktop: Assessment detail row (spans all columns) */}
            {hasAssessment && (
                <tr className="hidden md:table-row">
                    <td
                        colSpan={4}
                        className="px-6 pb-5 pt-0"
                    >
                        <AssessmentDetail progress={progress} />
                    </td>
                </tr>
            )}
        </>
    );
}

function AssessmentDetail({ progress }: { progress: ActivityProgress }) {
    const internalPoints = progress.internalProblems
        ? toProblemPoints(progress.internalProblems)
        : [];
    const externalPoints = progress.externalProblems
        ? toProblemPoints(progress.externalProblems)
        : [];

    return (
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                    กิจกรรมที่ 1
                </span>
                <span className="text-sm font-bold text-gray-700">
                    ผลการประเมินปัญหาภายใน/ภายนอก
                </span>
                {progress.problemType && (
                    <div className="ml-auto">
                        <ProblemTypeBadge problemType={progress.problemType} />
                    </div>
                )}
            </div>

            <p className="mb-3 text-xs text-gray-500">
                ประเด็นต่อไปนี้ใช้ประกอบการติดตามและวางแผนช่วยเหลือนักเรียน
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {progress.internalProblems && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <div className="mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-bold text-amber-800">
                                ปัญหาภายใน
                            </span>
                        </div>
                        <ul className="space-y-1 text-sm leading-relaxed text-gray-700">
                            {internalPoints.map((point) => (
                                <li key={point} className="flex gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {progress.externalProblems && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                        <div className="mb-2 flex items-center gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs font-bold text-blue-800">
                                ปัญหาภายนอก
                            </span>
                        </div>
                        <ul className="space-y-1 text-sm leading-relaxed text-gray-700">
                            {externalPoints.map((point) => (
                                <li key={point} className="flex gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
