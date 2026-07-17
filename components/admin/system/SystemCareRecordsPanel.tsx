"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    deleteSystemAdminCareRecord,
    getSystemStudentCareRecords,
} from "@/lib/actions/system-admin.actions";
import type {
    SystemCareRecordResponse,
} from "@/lib/actions/system-admin/types";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { filterSystemCareRecords } from "@/lib/utils/system-care-record-filter";
import { SummaryGrid } from "./SystemCareRecordViews";
import { SystemCareAdminPanel } from "./SystemCareAdminPanel";
import {
    CareRecordSections,
    type DeleteTarget,
} from "./SystemCareRecordSections";

export function SystemCareRecordsPanel({ studentId }: { studentId: string }) {
    const [data, setData] = useState<SystemCareRecordResponse | null>(null);
    const [selectedPhqId, setSelectedPhqId] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let isActive = true;
        startTransition(async () => {
            const result = await getSystemStudentCareRecords({ studentId });
            if (isActive) {
                setData(result);
                setSelectedPhqId(result?.phqResults[0]?.id ?? "");
            }
        });
        return () => {
            isActive = false;
        };
    }, [studentId]);

    const softDelete = () => {
        if (!deleteTarget) return;
        startTransition(async () => {
            const result = await deleteSystemAdminCareRecord(deleteTarget.type, {
                id: deleteTarget.id,
                expectedUpdatedAt: deleteTarget.expectedUpdatedAt,
                reason: deleteReason,
            });
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            setData((current) => removeRecord(current, deleteTarget));
            setDeleteTarget(null);
            setDeleteReason("");
            toast.success(result.message);
        });
    };

    if (!data) {
        return (
            <section className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูลดูแลนักเรียน
                </div>
            </section>
        );
    }

    const filteredData = selectedPhqId
        ? filterSystemCareRecords(data, selectedPhqId)
        : data;
    const allowMutations = selectedPhqId === data.phqResults[0]?.id;

    return (
        <section className="space-y-5">
            {data.phqResults.length > 0 ? <FilterSelect
                icon={CalendarRange}
                label="รอบข้อมูล:"
                id="system-care-phq-filter"
                value={selectedPhqId}
                onChange={setSelectedPhqId}
            >
                {data.phqResults.map((record) => (
                    <option key={record.id} value={record.id}>
                        {record.academicYearLabel} · ครั้งที่ {record.assessmentRound}
                    </option>
                ))}
            </FilterSelect> : null}
            <SummaryGrid data={filteredData} />
            <SystemCareAdminPanel
                data={filteredData}
                setData={setData}
                allowMutations={allowMutations}
            />
            <CareRecordSections
                data={filteredData}
                allowMutations={allowMutations}
                deleteTarget={deleteTarget}
                deleteReason={deleteReason}
                isPending={isPending}
                onStartDelete={(target) => {
                    setDeleteTarget(target);
                    setDeleteReason("");
                }}
                onReasonChange={setDeleteReason}
                onCancelDelete={() => setDeleteTarget(null)}
                onDelete={softDelete}
            />
        </section>
    );
}

function removeRecord(
    current: SystemCareRecordResponse | null,
    target: NonNullable<DeleteTarget>,
): SystemCareRecordResponse | null {
    if (!current) return current;
    if (target.type === "counselingSession") {
        return {
            ...current,
            counselingSessions: current.counselingSessions.filter(
                (record) => record.id !== target.id,
            ),
        };
    }
    return {
        ...current,
        homeVisits: current.homeVisits.filter((record) => record.id !== target.id),
    };
}
