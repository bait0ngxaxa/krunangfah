"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Clock3, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { searchSystemAuditTimeline } from "@/lib/actions/system-admin.actions";
import type { SystemAuditTimelineCursor } from "@/lib/actions/system-admin/types";
import {
    AuditSearchForm,
    type AuditEventKind,
} from "./SystemAuditSearchForm";
import {
    AuditTimelineRow,
    buildAuditTimeline,
    DataManagementAuditEventRow,
    EditEventRow,
    type AuditTimelineItem,
} from "./SystemAuditRows";

export {
    buildAuditTimeline,
    DataManagementAuditEventRow,
    EditEventRow,
};
export type { AuditTimelineItem };

export function SystemEventPanel() {
    const [timeline, setTimeline] = useState<AuditTimelineItem[]>([]);
    const [query, setQuery] = useState("");
    const [eventKind, setEventKind] = useState<AuditEventKind>("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [nextCursor, setNextCursor] =
        useState<SystemAuditTimelineCursor | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const requestIdRef = useRef(0);

    const loadEvents = useCallback(
        (mode: "replace" | "append") => {
            const dateError = getDateRangeError(dateFrom, dateTo);
            if (dateError) {
                setErrorMessage(dateError);
                return;
            }
            const requestId = requestIdRef.current + 1;
            requestIdRef.current = requestId;
            setErrorMessage(null);
            startTransition(async () => {
                try {
                    const response = await searchSystemAuditTimeline({
                        query,
                        eventKind,
                        dateFrom: dateFrom || undefined,
                        dateTo: dateTo || undefined,
                        cursor: mode === "append" ? nextCursor ?? undefined : undefined,
                        take: 50,
                    });
                    if (requestId !== requestIdRef.current) return;
                    if (!response.success) {
                        setErrorMessage(response.message);
                        setHasLoaded(true);
                        return;
                    }
                    setTimeline((current) =>
                        mode === "append"
                            ? [...current, ...response.events]
                            : response.events,
                    );
                    setNextCursor(response.nextCursor);
                    setHasLoaded(true);
                } catch {
                    if (requestId !== requestIdRef.current) return;
                    setErrorMessage("โหลดประวัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                    setHasLoaded(true);
                }
            });
        },
        [dateFrom, dateTo, eventKind, nextCursor, query, startTransition],
    );

    useEffect(() => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        startTransition(async () => {
            try {
                const response = await searchSystemAuditTimeline({ take: 50 });
                if (requestId !== requestIdRef.current) return;
                if (!response.success) {
                    setErrorMessage(response.message);
                    setHasLoaded(true);
                    return;
                }
                setTimeline(response.events);
                setNextCursor(response.nextCursor);
                setHasLoaded(true);
            } catch {
                if (requestId !== requestIdRef.current) return;
                setErrorMessage("โหลดประวัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                setHasLoaded(true);
            }
        });
    }, [startTransition]);

    return (
        <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3">
                <AuditPanelHeader />
                <AuditSearchForm
                    query={query}
                    eventKind={eventKind}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    error={errorMessage}
                    isPending={isPending}
                    onQueryChange={setQuery}
                    onEventKindChange={setEventKind}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                    onSubmit={() => loadEvents("replace")}
                />
            </div>

            {hasLoaded || isPending ? (
                <AuditResultList
                    timeline={timeline}
                    hasMore={Boolean(nextCursor)}
                    isPending={isPending}
                    errorMessage={errorMessage}
                    onLoadMore={() => loadEvents("append")}
                    onRetry={() => loadEvents("replace")}
                />
            ) : null}
        </section>
    );
}

function AuditPanelHeader() {
    return (
        <div>
            <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-semibold text-gray-950">
                    ประวัติรวม
                </h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">
                แสดงรายการล่าสุดทันที และค้นหาเหตุการณ์ย้อนหลังได้เมื่อต้องการ
            </p>
        </div>
    );
}

function AuditResultList({
    timeline,
    hasMore,
    isPending,
    errorMessage,
    onLoadMore,
    onRetry,
}: {
    timeline: AuditTimelineItem[];
    hasMore: boolean;
    isPending: boolean;
    errorMessage: string | null;
    onLoadMore: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="mt-4 space-y-3" aria-live="polite">
            <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {timeline.map((item) => (
                    <AuditTimelineRow key={`${item.kind}:${item.event.id}`} item={item} />
                ))}
                {errorMessage ? (
                    <AuditErrorState message={errorMessage} onRetry={onRetry} />
                ) : null}
                {isPending && timeline.length === 0 ? <AuditLoadingState /> : null}
                {!isPending && !errorMessage && timeline.length === 0 ? (
                    <AuditEmptyState />
                ) : null}
            </div>
            {hasMore ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    disabled={isPending}
                    onClick={onLoadMore}
                >
                    {isPending ? "กำลังโหลด" : "โหลดประวัติเพิ่ม"}
                </Button>
            ) : null}
        </div>
    );
}

function AuditEmptyState() {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
                <History className="h-4 w-4 text-emerald-600" />
                ไม่พบประวัติที่ตรงกับเงื่อนไข
            </div>
            <p className="mt-1 leading-6">
                ลองลดคำค้นหรือขยายช่วงวันที่เพื่อตรวจย้อนหลังจากประวัติทั้งหมด
            </p>
        </div>
    );
}

function AuditErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">{message}</p>
            <Button
                type="button"
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={onRetry}
            >
                โหลดประวัติอีกครั้ง
            </Button>
        </div>
    );
}

function AuditLoadingState() {
    return (
        <div className="space-y-2" aria-label="กำลังโหลดประวัติรวม">
            {[0, 1, 2].map((item) => (
                <div
                    key={item}
                    className="h-24 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="mt-3 h-4 w-3/4 rounded-full" />
                    <Skeleton className="mt-3 h-3 w-1/2 rounded-full" />
                </div>
            ))}
        </div>
    );
}

function getDateRangeError(dateFrom: string, dateTo: string): string | null {
    if (!dateFrom || !dateTo) return null;
    if (dateFrom <= dateTo) return null;
    return "วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด";
}
