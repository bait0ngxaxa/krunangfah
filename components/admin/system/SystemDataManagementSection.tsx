"use client";

import { useEffect, useState, useTransition } from "react";
import {
    ArchiveRestore,
    Check,
    DatabaseZap,
    Loader2,
    ShieldAlert,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ActionDialog } from "@/components/admin/data-management/ActionDialog";
import { EventRow } from "@/components/admin/data-management/EventRow";
import { ImpactGrid } from "@/components/admin/data-management/ImpactGrid";
import { getActionLabel } from "@/components/admin/data-management/labels";
import type {
    ManagedActionKey,
    ManagedPreview,
    PendingDataManagementAction,
} from "@/components/admin/data-management/types";
import {
    getDataManagementPreview,
    runDataManagementAction,
} from "@/lib/actions/data-management.actions";
import type {
    SchoolEntityResult,
    StudentEntityResult,
    SystemEntityResult,
    SystemSearchResult,
} from "@/lib/actions/system-admin/types";

interface SystemDataManagementSectionProps {
    entity: SchoolEntityResult | StudentEntityResult;
    onEntityUpdated: (entity: SystemEntityResult) => void;
    onEntityRemoved: () => void;
    onRefreshSearch: () => Promise<SystemSearchResult>;
}

export function SystemDataManagementSection({
    entity,
    onEntityUpdated,
    onEntityRemoved,
    onRefreshSearch,
}: SystemDataManagementSectionProps) {
    const [preview, setPreview] = useState<ManagedPreview | null>(null);
    const [pendingAction, setPendingAction] =
        useState<PendingDataManagementAction | null>(null);
    const [reason, setReason] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let active = true;
        startTransition(async () => {
            const next = await getDataManagementPreview(entity.type, entity.id);
            if (active) setPreview(next);
        });
        return () => {
            active = false;
        };
    }, [entity.id, entity.type]);

    const openAction = (action: ManagedActionKey) => {
        setReason("");
        setPendingAction({
            action,
            targetType: entity.type,
            targetId: entity.id,
            title: getActionLabel(action),
        });
    };

    const runAction = () => {
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

            if (pendingAction.action === "permanent-delete") {
                onEntityRemoved();
                return;
            }

            const nextResults = await onRefreshSearch();
            const refreshed = findEntity(nextResults, entity);
            if (refreshed) onEntityUpdated(refreshed);
            setPreview(
                await getDataManagementPreview(
                    pendingAction.targetType,
                    pendingAction.targetId,
                ),
            );
        });
    };

    return (
        <section className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-2">
                <DatabaseZap className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                    <h3 className="text-sm font-extrabold text-gray-900">
                        จัดการข้อมูล
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-700">
                        ตรวจผลกระทบและดำเนินการโดยไม่ออกจากศูนย์ดูแลระบบ
                    </p>
                </div>
            </div>

            {isPending && !preview ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดผลกระทบ
                </div>
            ) : null}

            {preview ? (
                <div className="mt-4 space-y-4">
                    <ImpactGrid impact={preview.impact} targetType={preview.type} />
                    <DataActionButtons preview={preview} onAction={openAction} />
                    <RecentEvents preview={preview} />
                </div>
            ) : null}

            <ActionDialog
                pendingAction={pendingAction}
                preview={preview}
                reason={reason}
                isPending={isPending}
                onReasonChange={setReason}
                onCancel={() => setPendingAction(null)}
                onConfirm={runAction}
            />
        </section>
    );
}

function DataActionButtons({
    preview,
    onAction,
}: {
    preview: ManagedPreview;
    onAction: (action: ManagedActionKey) => void;
}) {
    const canRestore = Boolean(preview.disabledAt);
    return (
        <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                        onAction(preview.isTestData ? "unmark-test" : "mark-test")
                    }
                >
                    <Check className="h-4 w-4" />
                    {preview.isTestData
                        ? "ยกเลิกข้อมูลทดสอบ"
                        : "ตั้งเป็นข้อมูลทดสอบ"}
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onAction(canRestore ? "restore" : "disable")}
                >
                    <ArchiveRestore className="h-4 w-4" />
                    {canRestore ? "กู้คืน" : "ปิดใช้งาน"}
                </Button>
            </div>
            <div className="rounded-xl border border-red-100 bg-white p-3">
                <div className="flex items-start gap-2 text-red-800">
                    <ShieldAlert className="mt-0.5 h-4 w-4" />
                    <p className="text-xs leading-5">
                        ลบถาวรใช้เฉพาะข้อมูลทดสอบหรือข้อมูลผิดจริง
                    </p>
                </div>
                <Button
                    type="button"
                    className="mt-3"
                    variant="danger"
                    fullWidth
                    onClick={() => onAction("permanent-delete")}
                >
                    <Trash2 className="h-4 w-4" />
                    ลบถาวร
                </Button>
            </div>
        </div>
    );
}

function RecentEvents({ preview }: { preview: ManagedPreview }) {
    return (
        <div>
            <h4 className="text-sm font-bold text-gray-900">
                ประวัติการจัดการข้อมูล
            </h4>
            <div className="mt-2 space-y-2">
                {preview.recentEvents.length === 0 ? (
                    <p className="text-sm text-gray-600">ยังไม่มีประวัติ</p>
                ) : (
                    preview.recentEvents.map((event) => (
                        <EventRow key={event.id} event={event} compact />
                    ))
                )}
            </div>
        </div>
    );
}

function findEntity(
    results: SystemSearchResult,
    entity: SchoolEntityResult | StudentEntityResult,
): SystemEntityResult | null {
    const collection = entity.type === "school" ? results.schools : results.students;
    return collection.find((item) => item.id === entity.id) ?? null;
}
