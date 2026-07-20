"use client";

import type { ReactNode } from "react";
import { CheckCircle2, RefreshCw, Undo2 } from "lucide-react";
import { getReferralStatus, type ReferralHistoryRecord, type ReferralStatus } from "@/types/referral.types";

const STATUS_LABELS: Record<ReferralStatus, string> = {
    active: "กำลังดำเนินการ",
    revoked: "เรียกคืนแล้ว",
    closed: "ปิดเมื่อเปลี่ยนผู้รับ",
};

function getStatusLabel(status: ReferralStatus): string {
    if (status === "active") return STATUS_LABELS.active;
    if (status === "revoked") return STATUS_LABELS.revoked;
    return STATUS_LABELS.closed;
}

export function ReferralHistoryTimeline({
    records,
    renderActions,
}: {
    records: ReferralHistoryRecord[];
    renderActions?: (record: ReferralHistoryRecord) => ReactNode;
}): ReactNode {
    const orderedRecords = [...records].sort(
        (first, second) =>
            second.createdAt.getTime() - first.createdAt.getTime() ||
            second.id.localeCompare(first.id),
    );

    return (
        <div className="space-y-3" aria-label="ประวัติการส่งต่อ">
            {orderedRecords.map((record) => {
                const status = getReferralStatus(record);
                return (
                    <ReferralHistoryRow
                        key={record.id}
                        record={record}
                        status={status}
                        actions={
                            status === "active" && renderActions
                                ? renderActions(record)
                                : undefined
                        }
                    />
                );
            })}
        </div>
    );
}

function ReferralHistoryRow({
    record,
    status,
    actions,
}: {
    record: ReferralHistoryRecord;
    status: ReferralStatus;
    actions?: ReactNode;
}): ReactNode {
    const isActive = status === "active";
    return (
        <article
            data-referral-id={record.id}
            className={
                isActive
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                    : "rounded-xl border border-gray-100 bg-gray-50 p-4"
            }
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <StatusIcon status={status} />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-950">
                                {isActive ? "รายการส่งต่อปัจจุบัน" : "รายการส่งต่อเดิม"}
                            </h4>
                            <span
                                className={
                                    isActive
                                        ? "rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white"
                                        : "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                                }
                            >
                                {getStatusLabel(status)}
                            </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-gray-600">
                            ส่งเมื่อ {formatDateTime(record.createdAt)}
                        </p>
                    </div>
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <HistoryField label="ผู้ส่ง" value={record.fromTeacherName ?? record.fromTeacherUserId} />
                <HistoryField label="ผู้รับ" value={record.toTeacherName ?? record.toTeacherUserId} />
                {status === "revoked" ? (
                    <>
                        <HistoryField label="วันที่เรียกคืน" value={formatDateTime(record.revokedAt)} />
                        <HistoryField label="ผู้เรียกคืน" value={record.revokedByName ?? record.revokedById ?? "-"} />
                        {record.revokeReason ? (
                            <div className="sm:col-span-2">
                                <HistoryField label="เหตุผล" value={record.revokeReason} />
                            </div>
                        ) : null}
                    </>
                ) : null}
                {status === "closed" ? (
                    <HistoryField label="วันที่ปิดรายการ" value={formatDateTime(record.closedAt)} />
                ) : null}
            </dl>
        </article>
    );
}

function StatusIcon({ status }: { status: ReferralStatus }): ReactNode {
    const Icon =
        status === "active"
            ? CheckCircle2
            : status === "revoked"
              ? Undo2
              : RefreshCw;
    return (
        <span
            className={
                status === "active"
                    ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white"
                    : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 ring-1 ring-gray-200"
            }
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
    );
}

function HistoryField({ label, value }: { label: string; value: string }): ReactNode {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-500">{label}</dt>
            <dd className="mt-0.5 break-words font-semibold text-gray-900">{value}</dd>
        </div>
    );
}

function formatDateTime(value: Date | null): string {
    if (!value || Number.isNaN(value.getTime())) return "-";
    return value.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
