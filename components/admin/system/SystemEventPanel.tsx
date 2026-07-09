"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    getActionLabel,
    toUiAction,
} from "@/components/admin/data-management/labels";
import { listDataManagementEvents } from "@/lib/actions/data-management.actions";
import { listSystemAdminEvents } from "@/lib/actions/system-admin.actions";
import type { DataManagementEventItem } from "@/components/admin/data-management/types";
import type {
    SystemAdminEditChange,
    SystemAdminEditEventItem,
} from "@/lib/actions/system-admin/types";

export type AuditTimelineItem =
    | { kind: "edit"; event: SystemAdminEditEventItem }
    | { kind: "data-management"; event: DataManagementEventItem };

export function SystemEventPanel() {
    const [timeline, setTimeline] = useState<AuditTimelineItem[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isPending, startTransition] = useTransition();

    const loadEvents = () => {
        startTransition(async () => {
            const [dataManagement, systemAdmin] = await Promise.all([
                listDataManagementEvents(),
                listSystemAdminEvents(),
            ]);
            setTimeline(buildAuditTimeline(dataManagement.events, systemAdmin.events));
            setHasLoaded(true);
        });
    };

    return (
        <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-emerald-600" />
                        <h2 className="text-base font-semibold text-gray-950">
                            เหตุการณ์การจัดการข้อมูล
                        </h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                        โหลดเมื่อจำเป็น เพื่อลด query ตอนเปิดหน้า
                    </p>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={loadEvents}
                >
                    {isPending ? "กำลังโหลด" : "โหลดประวัติ"}
                </Button>
            </div>

            {hasLoaded ? (
                <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {timeline.map((item) => (
                        <AuditTimelineRow
                            key={`${item.kind}:${item.event.id}`}
                            item={item}
                        />
                    ))}
                    {timeline.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                            ยังไม่มีเหตุการณ์การจัดการหรือการแก้ไขข้อมูล
                        </p>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}

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
    if (item.kind === "edit") return <EditEventRow event={item.event} />;
    return <DataManagementAuditEventRow event={item.event} />;
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
            {event.warnings.length > 0 ? (
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
            ) : null}
        </AuditEventFrame>
    );
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

function AuditEventFrame({
    title,
    actorEmail,
    reason,
    createdAt,
    tone,
    children,
}: {
    title: string;
    actorEmail: string | null;
    reason: string;
    createdAt: Date;
    tone: "emerald" | "gray";
    children: ReactNode;
}) {
    const className = tone === "emerald"
        ? "rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"
        : "rounded-xl border border-gray-100 bg-gray-50 p-3";

    return (
        <div className={className}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-gray-950">{title}</p>
                    <p className="mt-1 text-xs font-medium text-gray-700">
                        ทำรายการโดย {actorEmail ?? "ไม่พบอีเมลผู้ทำรายการ"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{reason}</p>
                </div>
                <p className="shrink-0 text-xs text-gray-500">
                    {createdAt.toLocaleString("th-TH")}
                </p>
            </div>
            {children}
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

function formatAuditValue(
    value: SystemAdminEditChange["before"],
): string {
    if (value === null || value === "") return "-";
    if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
    return String(value);
}
