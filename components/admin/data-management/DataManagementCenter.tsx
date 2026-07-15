"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
    getDataManagementPreview,
    listDataManagementEvents,
    runDataManagementAction,
    searchDataManagement,
} from "@/lib/actions/data-management.actions";
import { hasDataManagementSearchIntent } from "@/lib/actions/data-management/search-intent";
import {
    STALE_PREVIEW_MESSAGE,
} from "@/lib/actions/data-management/types";
import type { DataManagementSearchResult } from "@/lib/actions/data-management/types";
import { ActionDialog } from "./ActionDialog";
import {
    EmptySelection,
    getNextTargetType,
    mergeSearchResults,
} from "./DataManagementCenterHelpers";
import { DetailPanel } from "./DetailPanel";
import { getActionLabel } from "./labels";
import { HistoryPanel } from "./HistoryPanel";
import { SearchControls } from "./SearchControls";
import { SearchResultState } from "./SearchResultState";
import { TargetRow } from "./TargetRow";
import type {
    DataManagementEventItem,
    ManagedActionKey,
    ManagedPreview,
    ManagedTarget,
    ManagedTargetType,
    PendingDataManagementAction,
} from "./types";
import {
    createDataManagementActionInput,
    isPermanentDeleteEligible,
} from "./types";

const EMPTY_RESULTS: DataManagementSearchResult = {
    schools: [],
    students: [],
    schoolNextCursor: null,
    studentNextCursor: null,
    schoolHasMore: false,
    studentHasMore: false,
};

export function DataManagementCenter() {
    const [query, setQuery] = useState("");
    const [targetType, setTargetType] = useState<"all" | ManagedTargetType>("all");
    const [dataState, setDataState] = useState<
        "all" | "active" | "disabled" | "test"
    >("all");
    const [results, setResults] =
        useState<DataManagementSearchResult>(EMPTY_RESULTS);
    const [hasSearched, setHasSearched] = useState(false);
    const [preview, setPreview] = useState<ManagedPreview | null>(null);
    const [events, setEvents] = useState<DataManagementEventItem[]>([]);
    const [pendingAction, setPendingAction] =
        useState<PendingDataManagementAction | null>(null);
    const [reason, setReason] = useState("");
    const [isPending, startTransition] = useTransition();
    const previewRequestId = useRef(0);

    const targets = useMemo<ManagedTarget[]>(
        () => [...results.schools, ...results.students],
        [results],
    );
    const canSearch = hasDataManagementSearchIntent({ query, dataState });
    const hasMore = results.schoolHasMore || results.studentHasMore;

    const refreshSearch = useCallback(() => {
        const requestId = ++previewRequestId.current;
        setPendingAction(null);
        setReason("");
        setPreview(null);
        if (!canSearch) {
            setHasSearched(false);
            setResults(EMPTY_RESULTS);
            setPreview(null);
            toast.info("ใส่คำค้นอย่างน้อย 2 ตัวอักษร หรือเลือกสถานะข้อมูลทดสอบ/ปิดใช้งาน");
            return;
        }
        startTransition(async () => {
            const next = await searchDataManagement({ query, targetType, dataState });
            if (requestId !== previewRequestId.current) return;
            setHasSearched(true);
            setResults(next);
        });
    }, [canSearch, dataState, query, targetType]);

    const loadMore = useCallback(() => {
        if (!canSearch || !hasMore) return;
        const nextTargetType = getNextTargetType(results, targetType);
        startTransition(async () => {
            const next = await searchDataManagement({
                query,
                dataState,
                targetType: nextTargetType,
                schoolCursor: results.schoolHasMore
                    ? results.schoolNextCursor ?? undefined
                    : undefined,
                studentCursor: results.studentHasMore
                    ? results.studentNextCursor ?? undefined
                    : undefined,
            });
            setResults(mergeSearchResults(results, next, nextTargetType));
        });
    }, [canSearch, dataState, hasMore, query, results, targetType]);

    const loadPreview = useCallback((target: ManagedTarget) => {
        const requestId = ++previewRequestId.current;
        setPendingAction(null);
        setReason("");
        setPreview(null);
        startTransition(async () => {
            const next = await getDataManagementPreview(target.type, target.id);
            const history = await listDataManagementEvents();
            if (requestId !== previewRequestId.current) return;
            setPreview(next);
            setEvents(history.events);
        });
    }, []);

    const openAction = useCallback(
        (action: ManagedActionKey) => {
            if (!preview) return;
            if (
                action === "permanent-delete" &&
                !isPermanentDeleteEligible(preview)
            ) {
                return;
            }
            setReason("");
            setPendingAction({
                action,
                targetType: preview.type,
                targetId: preview.id,
                title: getActionLabel(action),
            });
        },
        [preview],
    );

    const runAction = useCallback(() => {
        if (!pendingAction || !preview || pendingAction.targetId !== preview.id) {
            return;
        }
        const action = pendingAction;
        const actionInput = createDataManagementActionInput(
            action,
            preview,
            reason,
        );
        const requestId = previewRequestId.current;
        startTransition(async () => {
            const result = await runDataManagementAction(
                action.targetType,
                action.action,
                actionInput,
            );
            if (requestId !== previewRequestId.current) return;
            if (!result.success) {
                toast.error(result.message);
                if (result.message === STALE_PREVIEW_MESSAGE) {
                    setPendingAction(null);
                    setReason("");
                    const nextPreview = await getDataManagementPreview(
                        action.targetType,
                        action.targetId,
                    );
                    if (requestId === previewRequestId.current) {
                        setPreview(nextPreview);
                    }
                }
                return;
            }

            toast.success(result.message);
            setPendingAction(null);
            setReason("");
            if (canSearch) {
                const nextResults = await searchDataManagement({
                    query,
                    targetType,
                    dataState,
                });
                if (requestId !== previewRequestId.current) return;
                setResults(nextResults);
            }
            const nextEvents = await listDataManagementEvents();
            if (requestId !== previewRequestId.current) return;
            setEvents(nextEvents.events);
            if (action.action === "permanent-delete") {
                setPreview(null);
                return;
            }
            const nextPreview = await getDataManagementPreview(
                action.targetType,
                action.targetId,
            );
            if (requestId === previewRequestId.current) setPreview(nextPreview);
        });
    }, [canSearch, dataState, pendingAction, preview, query, reason, targetType]);

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <SearchControls
                    query={query}
                    targetType={targetType}
                    dataState={dataState}
                    isPending={isPending}
                    canSearch={canSearch}
                    onQueryChange={setQuery}
                    onTargetTypeChange={setTargetType}
                    onDataStateChange={setDataState}
                    onSearch={refreshSearch}
                />
                <div className="mt-5">
                    <SearchResultState
                        hasSearched={hasSearched}
                        isPending={isPending}
                        resultCount={targets.length}
                    />
                    {targets.length > 0 ? (
                        <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                            {targets.map((target) => (
                                <TargetRow
                                    key={`${target.type}:${target.id}`}
                                    target={target}
                                    selected={preview?.id === target.id}
                                    onClick={() => loadPreview(target)}
                                />
                            ))}
                        </div>
                    ) : null}
                    {hasSearched && targets.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-gray-500">
                                แสดงผลลัพธ์แบบแบ่งหน้า ถ้าไม่เจอข้อมูลให้เพิ่มคำค้นให้เฉพาะขึ้น
                            </p>
                            {hasMore ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={loadMore}
                                >
                                    โหลดเพิ่ม
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </section>

            <aside className="min-h-[560px] rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                {preview ? (
                    <DetailPanel preview={preview} onAction={openAction} />
                ) : (
                    <EmptySelection />
                )}
            </aside>

            <HistoryPanel events={events} />
            <ActionDialog
                pendingAction={pendingAction}
                preview={preview}
                reason={reason}
                isPending={isPending}
                onReasonChange={setReason}
                onCancel={() => {
                    setPendingAction(null);
                    setReason("");
                }}
                onConfirm={runAction}
            />
        </div>
    );
}
