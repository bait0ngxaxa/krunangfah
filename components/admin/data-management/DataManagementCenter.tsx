"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import {
    getDataManagementPreview,
    listDataManagementEvents,
    runDataManagementAction,
    searchDataManagement,
} from "@/lib/actions/data-management.actions";
import { hasDataManagementSearchIntent } from "@/lib/actions/data-management/search-intent";
import type { DataManagementSearchResult } from "@/lib/actions/data-management/types";
import { ActionDialog } from "./ActionDialog";
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

const EMPTY_RESULTS: DataManagementSearchResult = { schools: [], students: [] };

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

    const targets = useMemo<ManagedTarget[]>(
        () => [...results.schools, ...results.students],
        [results],
    );
    const canSearch = hasDataManagementSearchIntent({ query, dataState });

    const refreshSearch = useCallback(() => {
        if (!canSearch) {
            setHasSearched(false);
            setResults(EMPTY_RESULTS);
            setPreview(null);
            toast.info("ใส่คำค้นอย่างน้อย 2 ตัวอักษร หรือเลือกสถานะข้อมูลทดสอบ/ปิดใช้งาน");
            return;
        }
        startTransition(async () => {
            const next = await searchDataManagement({ query, targetType, dataState });
            setHasSearched(true);
            setPreview(null);
            setResults(next);
        });
    }, [canSearch, dataState, query, targetType]);

    const loadPreview = useCallback((target: ManagedTarget) => {
        startTransition(async () => {
            const next = await getDataManagementPreview(target.type, target.id);
            const history = await listDataManagementEvents();
            setPreview(next);
            setEvents(history.events);
        });
    }, []);

    const openAction = useCallback(
        (action: ManagedActionKey) => {
            if (!preview) return;
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
        if (!pendingAction) return;
        startTransition(async () => {
            const result = await runDataManagementAction(
                pendingAction.targetType,
                pendingAction.action,
                { id: pendingAction.targetId, reason },
            );
            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            setPendingAction(null);
            setReason("");
            if (canSearch) {
                setResults(await searchDataManagement({ query, targetType, dataState }));
            }
            setEvents((await listDataManagementEvents()).events);
            if (pendingAction.action === "permanent-delete") {
                setPreview(null);
                return;
            }
            setPreview(
                await getDataManagementPreview(
                    pendingAction.targetType,
                    pendingAction.targetId,
                ),
            );
        });
    }, [canSearch, dataState, pendingAction, query, reason, targetType]);

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
                        <p className="mt-3 text-xs text-gray-500">
                            แสดงผลลัพธ์แบบจำกัดจำนวน ถ้าไม่เจอข้อมูลให้เพิ่มคำค้นให้เฉพาะขึ้น
                        </p>
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
                onCancel={() => setPendingAction(null)}
                onConfirm={runAction}
            />
        </div>
    );
}

function EmptySelection() {
    return (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
            <DatabaseZap className="h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 text-lg font-bold text-gray-800">
                เลือกข้อมูลเพื่อจัดการ
            </h2>
            <p className="mt-1 max-w-xs text-sm text-gray-600">
                ค้นหาแล้วเลือกโรงเรียนหรือนักเรียนเพื่อดูผลกระทบและ action ที่ทำได้
            </p>
        </div>
    );
}
