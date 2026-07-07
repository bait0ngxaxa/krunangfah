"use client";

import { useMemo, useState, useTransition } from "react";
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
    const [query, setQuery] = useState("");
    const [entityType, setEntityType] = useState<SystemEntityFilter>("all");
    const [results, setResults] = useState(EMPTY_SYSTEM_RESULTS);
    const [selected, setSelected] = useState<SystemEntityResult | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isPending, startTransition] = useTransition();
    const flatResults = useMemo(() => flattenSystemResults(results), [results]);

    const runSearch = () => {
        if (query.trim().length < 2) {
            toast.info("พิมพ์คำค้นอย่างน้อย 2 ตัวอักษร");
            return;
        }

        startTransition(async () => {
            const next = await searchSystemAdminEntities({ query, entityType });
            setResults(next);
            setSelected(null);
            setHasSearched(true);
        });
    };

    const handleEntityUpdated = (entity: SystemEntityResult) => {
        setSelected(entity);
        setResults((current) => ({
            schools: entity.type === "school"
                ? current.schools.map((item) =>
                      item.id === entity.id ? entity : item,
                  )
                : current.schools,
            users: current.users,
            teachers: current.teachers,
            students: entity.type === "student"
                ? current.students.map((item) =>
                      item.id === entity.id ? entity : item,
                  )
                : current.students,
        }));
    };

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4 xl:self-start">
                <SystemSearchControls
                    query={query}
                    entityType={entityType}
                    isPending={isPending}
                    onQueryChange={setQuery}
                    onEntityTypeChange={setEntityType}
                    onSearch={runSearch}
                />
                <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-base font-extrabold text-gray-900">
                            ผลการค้นหา
                        </h2>
                        {hasSearched ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
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
            />
        </div>
    );
}
