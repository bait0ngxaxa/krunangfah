"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
    getActionLabel,
    toUiAction,
} from "@/components/admin/data-management/labels";
import type { DataManagementEventItem } from "@/components/admin/data-management/types";
import type {
    SystemAdminEditChange,
    SystemAdminEditEventItem,
} from "@/lib/actions/system-admin/types";

export type AuditTimelineItem =
    | { kind: "edit"; event: SystemAdminEditEventItem }
    | { kind: "data-management"; event: DataManagementEventItem };

export function buildAuditTimeline(
    events: DataManagementEventItem[],
    editEvents: SystemAdminEditEventItem[],
): AuditTimelineItem[] {
    return [
        ...events.map((event) => ({ kind: "data-management", event }) as const),
        ...editEvents.map((event) => ({ kind: "edit", event }) as const),
    ].sort((a, b) => b.event.createdAt.getTime() - a.event.createdAt.getTime());
}

export function AuditTimelineRow({ item }: { item: AuditTimelineItem }) {
    const [isOpen, setIsOpen] = useState(false);
    const summary = getTimelineSummary(item);

    return (
        <AuditEventFrame
            title={summary.title}
            actorEmail={item.event.actorEmail}
            reason={item.event.reason}
            createdAt={item.event.createdAt}
            tone={item.kind === "edit" ? "emerald" : "gray"}
            meta={summary.meta}
            isOpen={isOpen}
            onToggle={() => setIsOpen((current) => !current)}
        >
            {isOpen ? <AuditTimelineDetails item={item} /> : null}
        </AuditEventFrame>
    );
}

export function EditEventRow({ event }: { event: SystemAdminEditEventItem }) {
    return (
        <AuditEventFrame
            title={`${getEditEventActionLabel(event.action)}: ${event.targetLabel}`}
            actorEmail={event.actorEmail}
            reason={event.reason}
            createdAt={event.createdAt}
            tone="emerald"
        >
            <ChangeList eventId={event.id} changes={event.changes} />
        </AuditEventFrame>
    );
}

export function DataManagementAuditEventRow({
    event,
}: {
    event: DataManagementEventItem;
}) {
    return (
        <AuditEventFrame
            title={`${getActionLabel(toUiAction(event.action))}: ${event.targetLabel}`}
            actorEmail={event.actorEmail}
            reason={event.reason}
            createdAt={event.createdAt}
            tone="gray"
        >
            <WarningList event={event} />
        </AuditEventFrame>
    );
}

function AuditEventFrame({
    title,
    actorEmail,
    reason,
    createdAt,
    tone,
    meta,
    isOpen,
    onToggle,
    children,
}: {
    title: string;
    actorEmail: string | null;
    reason: string;
    createdAt: Date;
    tone: "emerald" | "gray";
    meta?: string;
    isOpen?: boolean;
    onToggle?: () => void;
    children: ReactNode;
}) {
    const className = tone === "emerald"
        ? "rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"
        : "rounded-xl border border-gray-100 bg-gray-50 p-3";

    return (
        <div className={className}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    {meta ? (
                        <p className="text-xs font-semibold text-emerald-800">
                            {meta}
                        </p>
                    ) : null}
                    <p className="mt-1 break-words text-sm font-semibold text-gray-950">
                        {title}
                    </p>
                    <p className="mt-1 break-words text-xs font-medium text-gray-700">
                        ทำรายการโดย {actorEmail ?? "ไม่พบอีเมลผู้ทำรายการ"}
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-gray-600">
                        {reason}
                    </p>
                </div>
                <AuditExpandButton
                    isOpen={isOpen}
                    onToggle={onToggle}
                    createdAt={createdAt}
                />
            </div>
            {children}
        </div>
    );
}

function AuditExpandButton({
    isOpen,
    onToggle,
    createdAt,
}: {
    isOpen?: boolean;
    onToggle?: () => void;
    createdAt: Date;
}) {
    return (
        <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="text-right text-xs tabular-nums text-gray-500">
                {createdAt.toLocaleString("th-TH")}
            </p>
            {onToggle ? (
                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-base hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                    onClick={onToggle}
                >
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
            ) : null}
        </div>
    );
}

function AuditTimelineDetails({ item }: { item: AuditTimelineItem }) {
    if (item.kind === "edit") {
        return <ChangeList eventId={item.event.id} changes={item.event.changes} />;
    }
    return <WarningList event={item.event} />;
}

function WarningList({ event }: { event: DataManagementEventItem }) {
    if (event.warnings.length === 0) return null;
    return (
        <div className="mt-2 space-y-1">
            {event.warnings.map((warning) => (
                <p
                    key={`${event.id}:${warning}`}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800"
                >
                    {warning}
                </p>
            ))}
        </div>
    );
}

function ChangeList({
    eventId,
    changes,
}: {
    eventId: string;
    changes: SystemAdminEditChange[];
}) {
    if (changes.length === 0) return null;
    return (
        <div className="mt-2 space-y-1.5">
            {changes.map((change) => (
                <div
                    key={`${eventId}:${change.field}`}
                    className="rounded-lg border border-emerald-100 bg-white px-2.5 py-2 text-xs text-gray-700"
                >
                    <p className="font-semibold text-emerald-900">{change.label}</p>
                    <div className="mt-1 grid gap-1 sm:grid-cols-2">
                        <span>จาก {formatAuditValue(change.before)}</span>
                        <span>เป็น {formatAuditValue(change.after)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function getTimelineSummary(item: AuditTimelineItem): {
    title: string;
    meta: string;
} {
    if (item.kind === "edit") {
        return {
            title: `${getEditEventActionLabel(item.event.action)}: ${item.event.targetLabel}`,
            meta: "การแก้ไขข้อมูล",
        };
    }
    return {
        title: `${getActionLabel(toUiAction(item.event.action))}: ${item.event.targetLabel}`,
        meta: "การจัดการข้อมูล",
    };
}

function getEditEventActionLabel(
    action: SystemAdminEditEventItem["action"],
): string {
    switch (action) {
        case "CREATE":
            return "เพิ่มข้อมูล";
        case "DELETE":
            return "ลบข้อมูล";
        case "RESET":
            return "ล้างผลข้อมูล";
        case "EDIT":
            return "แก้ไขข้อมูล";
    }
}

function formatAuditValue(
    value: SystemAdminEditChange["before"],
): string {
    if (value === null || value === "") return "-";
    if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
    return String(value);
}
