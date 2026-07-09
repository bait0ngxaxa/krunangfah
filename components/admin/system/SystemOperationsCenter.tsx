"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { searchSystemAdminEntities } from "@/lib/actions/system-admin.actions";
import type { SystemEntityResult } from "@/lib/actions/system-admin/types";
import { SystemDetailPanel } from "./SystemDetailPanel";
import { SystemEventPanel } from "./SystemEventPanel";
import { SystemResultList } from "./SystemResultList";
import { SystemSearchControls } from "./SystemSearchControls";
import {
    EMPTY_SYSTEM_RESULTS,
    flattenSystemResults,
    type SystemEntityFilter,
} from "./types";

export function SystemOperationsCenter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") ?? "";
    const initialEntityType = getEntityFilter(searchParams.get("entityType"));
    const [query, setQuery] = useState(initialQuery);
    const [entityType, setEntityType] =
        useState<SystemEntityFilter>(initialEntityType);
    const [results, setResults] = useState(EMPTY_SYSTEM_RESULTS);
    const [selected, setSelected] = useState<SystemEntityResult | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isPending, startTransition] = useTransition();
    const flatResults = useMemo(() => flattenSystemResults(results), [results]);

    const replaceSearchParams = useCallback(
        (nextQuery: string, nextEntityType: SystemEntityFilter) => {
            const params = new URLSearchParams(searchParams.toString());
            const trimmedQuery = nextQuery.trim();
            if (trimmedQuery.length > 0) {
                params.set("q", trimmedQuery);
            } else {
                params.delete("q");
            }
            if (nextEntityType === "all") {
                params.delete("entityType");
            } else {
                params.set("entityType", nextEntityType);
            }
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const searchWithState = useCallback(
        (nextQuery: string, nextEntityType: SystemEntityFilter) => {
            const trimmedQuery = nextQuery.trim();
            if (trimmedQuery.length < 2) {
                return Promise.resolve(EMPTY_SYSTEM_RESULTS);
            }
            return searchSystemAdminEntities({
                query: trimmedQuery,
                entityType: nextEntityType,
            });
        },
        [],
    );

    const runSearch = useCallback(() => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 2) {
            toast.info("พิมพ์คำค้นอย่างน้อย 2 ตัวอักษร");
            return;
        }

        replaceSearchParams(trimmedQuery, entityType);
        startTransition(async () => {
            const next = await searchWithState(trimmedQuery, entityType);
            setResults(next);
            setSelected(null);
            setHasSearched(true);
        });
    }, [entityType, query, replaceSearchParams, searchWithState]);

    const refreshSearch = useCallback(async () => {
        const next = await searchWithState(query, entityType);
        setResults(next);
        setHasSearched(query.trim().length >= 2);
        return next;
    }, [entityType, query, searchWithState]);

    const handleEntityUpdated = (entity: SystemEntityResult) => {
        setSelected(entity);
        setResults((current) => ({
            schools: entity.type === "school"
                ? current.schools.map((item) =>
                      item.id === entity.id ? entity : item,
                  )
                : current.schools,
            staffs: entity.type === "staff"
                ? current.staffs.map((item) =>
                      item.id === entity.id ? entity : item,
                  )
                : current.staffs,
            students: entity.type === "student"
                ? current.students.map((item) =>
                      item.id === entity.id ? entity : item,
                  )
                : current.students,
        }));
    };

    const handleEntityRemoved = (entity: SystemEntityResult) => {
        setSelected(null);
        setResults((current) => ({
            schools: current.schools.filter((item) => item.id !== entity.id),
            staffs: current.staffs.filter((item) => item.id !== entity.id),
            students: current.students.filter((item) => item.id !== entity.id),
        }));
    };

    useEffect(() => {
        if (initialQuery.trim().length < 2) return;
        startTransition(async () => {
            const next = await searchWithState(initialQuery, initialEntityType);
            setResults(next);
            setHasSearched(true);
        });
    }, [initialEntityType, initialQuery, searchWithState]);

    return (
        <div className="space-y-5">
            <SystemSearchControls
                query={query}
                entityType={entityType}
                isPending={isPending}
                onQueryChange={setQuery}
                onEntityTypeChange={setEntityType}
                onSearch={runSearch}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(320px,390px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-5 xl:sticky xl:top-5 xl:self-start">
                    <section
                        className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
                        aria-labelledby="system-results-heading"
                    >
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2
                                    id="system-results-heading"
                                    className="text-base font-semibold text-gray-950"
                                >
                                    ผลการค้นหา
                                </h2>
                                <p className="mt-0.5 text-xs leading-5 text-gray-600">
                                    เลือกรายการเพื่อเปิดรายละเอียดด้านขวา
                                </p>
                            </div>
                            {hasSearched ? (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-800">
                                    {flatResults.length} รายการ
                                </span>
                            ) : null}
                        </div>
                        <SystemResultList
                            results={flatResults}
                            selectedId={selected?.id ?? null}
                            hasSearched={hasSearched}
                            isPending={isPending}
                            onSelect={setSelected}
                        />
                    </section>
                    <SystemEventPanel />
                </div>
                <SystemDetailPanel
                    entity={selected}
                    onEntityUpdated={handleEntityUpdated}
                    onEntityRemoved={handleEntityRemoved}
                    onRefreshSearch={refreshSearch}
                />
            </div>
        </div>
    );
}

function getEntityFilter(value: string | null): SystemEntityFilter {
    if (value === "user" || value === "teacher") return "staff";
    if (value === "school" || value === "staff" || value === "student") {
        return value;
    }
    return "all";
}
