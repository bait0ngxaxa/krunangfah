"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    deleteSystemAdminCareRecord,
    getSystemStudentCareRecords,
} from "@/lib/actions/system-admin.actions";
import type {
    SystemCareRecordResponse,
} from "@/lib/actions/system-admin/types";
import { SummaryGrid } from "./SystemCareRecordViews";
import { SystemCareAdminPanel } from "./SystemCareAdminPanel";
import {
    CareRecordSections,
    type DeleteTarget,
} from "./SystemCareRecordSections";

export function SystemCareRecordsPanel({ studentId }: { studentId: string }) {
    const [data, setData] = useState<SystemCareRecordResponse | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let isActive = true;
        startTransition(async () => {
            const result = await getSystemStudentCareRecords({ studentId });
            if (isActive) setData(result);
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

    return (
        <section className="space-y-5">
            <SummaryGrid data={data} />
            <SystemCareAdminPanel
                data={data}
                setData={setData}
            />
            <CareRecordSections
                data={data}
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
