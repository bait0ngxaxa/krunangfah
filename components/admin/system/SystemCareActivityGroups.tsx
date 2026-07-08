"use client";

import type { SystemActivityRecord } from "@/lib/actions/system-admin/types";
import {
    DeleteReasonBox,
    EmptyState,
    RecordRow,
} from "./SystemCareRecordViews";
import { getActivityStatusLabel } from "./labels";

export function SystemCareActivityGroups({
    records,
    resetTarget,
    resetReason,
    isPending,
    onStartReset,
    onReasonChange,
    onCancelReset,
    onReset,
}: {
    records: SystemActivityRecord[];
    resetTarget: SystemActivityRecord | null;
    resetReason: string;
    isPending: boolean;
    onStartReset: (record: SystemActivityRecord) => void;
    onReasonChange: (value: string) => void;
    onCancelReset: () => void;
    onReset: () => void;
}) {
    const groups = groupActivities(records);
    if (groups.length === 0) return <EmptyState />;

    return (
        <div className="space-y-3">
            {groups.map((group) => (
                <div
                    key={group.key}
                    className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3"
                >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-gray-900">
                            {group.label}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {group.records.length} กิจกรรม
                        </span>
                    </div>
                    <div className="space-y-2">
                        {group.records.map((record) => (
                            <RecordRow
                                key={record.id}
                                title={`กิจกรรมที่ ${record.activityNumber}`}
                                subtitle={`${getActivityStatusLabel(record.status)} · ${record.teacherName ?? "ไม่ระบุครู"}`}
                                body={record.teacherNotes ?? "ยังไม่มีบันทึกครู"}
                                deleteLabel={`ล้างผลกิจกรรมที่ ${record.activityNumber}`}
                                onDelete={canResetActivity(record) ? () => onStartReset(record) : undefined}
                            >
                                {resetTarget?.id === record.id ? (
                                    <DeleteReasonBox
                                        title={`ล้างผลกิจกรรมที่ ${record.activityNumber}`}
                                        buttonLabel="ล้างผลกิจกรรม"
                                        reasonLabel="เหตุผลการล้างผลกิจกรรม"
                                        reasonPlaceholder="เช่น บันทึกกิจกรรมผิดรายการ ต้องถอยกลับให้ครูแก้ไข"
                                        value={resetReason}
                                        isPending={isPending}
                                        onChange={onReasonChange}
                                        onCancel={onCancelReset}
                                        onDelete={onReset}
                                    />
                                ) : null}
                            </RecordRow>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function canResetActivity(record: SystemActivityRecord): boolean {
    return record.status === "completed";
}

function groupActivities(records: SystemActivityRecord[]) {
    const groups = new Map<string, SystemActivityRecord[]>();
    for (const record of records) {
        const key = `${record.academicYearLabel}:${record.assessmentRound}`;
        groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    return Array.from(groups, ([key, items]) => ({
        key,
        label: `ผลคัดกรองครั้งที่ ${items[0]?.assessmentRound ?? "-"} · ${items[0]?.academicYearLabel ?? "-"}`,
        records: items,
    }));
}
