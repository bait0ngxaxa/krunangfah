"use client";

import { useState, useTransition } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EventRow } from "@/components/admin/data-management/EventRow";
import { listDataManagementEvents } from "@/lib/actions/data-management.actions";
import { listSystemAdminEvents } from "@/lib/actions/system-admin.actions";
import type { DataManagementEventItem } from "@/components/admin/data-management/types";
import type { SystemAdminEditEventItem } from "@/lib/actions/system-admin/types";

export function SystemEventPanel() {
    const [events, setEvents] = useState<DataManagementEventItem[]>([]);
    const [editEvents, setEditEvents] = useState<SystemAdminEditEventItem[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isPending, startTransition] = useTransition();

    const loadEvents = () => {
        startTransition(async () => {
            const [dataManagement, systemAdmin] = await Promise.all([
                listDataManagementEvents(),
                listSystemAdminEvents(),
            ]);
            setEvents(dataManagement.events);
            setEditEvents(systemAdmin.events);
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
                    {editEvents.map((event) => (
                        <EditEventRow key={event.id} event={event} />
                    ))}
                    {events.map((event) => (
                        <EventRow key={event.id} event={event} compact />
                    ))}
                    {events.length === 0 && editEvents.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                            ยังไม่มีเหตุการณ์การจัดการหรือการแก้ไขข้อมูล
                        </p>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}

export function EditEventRow({ event }: { event: SystemAdminEditEventItem }) {
    return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-gray-950">
                        แก้ไขข้อมูล: {event.targetLabel}
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-700">
                        ทำรายการโดย {event.actorEmail ?? "ไม่พบอีเมลผู้ทำรายการ"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">{event.reason}</p>
                </div>
                <p className="shrink-0 text-xs text-gray-500">
                    {event.createdAt.toLocaleString("th-TH")}
                </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {event.changes.map((change) => (
                    <span
                        key={`${event.id}:${change.field}`}
                        className="rounded-full border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-800"
                    >
                        {change.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
