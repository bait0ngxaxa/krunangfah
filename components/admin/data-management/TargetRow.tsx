import { Building2, UserRound } from "lucide-react";
import { StatusPills } from "./StatusPills";
import type { ManagedTarget } from "./types";

export function TargetRow({
    target,
    selected,
    onClick,
}: {
    target: ManagedTarget;
    selected: boolean;
    onClick: () => void;
}) {
    const Icon = target.type === "school" ? Building2 : UserRound;
    const title =
        target.type === "school"
            ? target.name
            : `${target.firstName} ${target.lastName}`;
    const subtitle =
        target.type === "school"
            ? `${target.province ?? "ไม่ระบุจังหวัด"} · นักเรียน ${target.studentCount} · ผู้ใช้ ${target.userCount}`
            : `${target.schoolName} · ${target.class} · รหัส ${target.studentId}`;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-xl border p-4 text-left transition ${
                selected
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/60"
            }`}
        >
            <div className="flex items-start gap-3">
                <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-gray-900">
                            {title}
                        </h3>
                        <StatusPills
                            disabledAt={target.disabledAt}
                            isTestData={target.isTestData}
                        />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
                    {target.type === "student" && target.nationalIdMasked ? (
                        <p className="mt-1 text-xs text-gray-500">
                            เลขบัตร {target.nationalIdMasked}
                        </p>
                    ) : null}
                </div>
            </div>
        </button>
    );
}
