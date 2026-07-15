"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import {
    createDataManagementActionInput,
    getPermanentDeleteEligibilityMessage,
    isPermanentDeleteEligible,
} from "@/components/admin/data-management/types";
import type {
    ManagedActionKey,
    ManagedPreview,
    PendingDataManagementAction,
} from "@/components/admin/data-management/types";
import {
    getDataManagementPreview,
    runDataManagementAction,
} from "@/lib/actions/data-management.actions";
import { STALE_PREVIEW_MESSAGE } from "@/lib/actions/data-management/types";
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
    const entityKey = entity.type + ":" + entity.id;
    const targetType = entity.type;
    const targetId = entity.id;
    const activeEntityKey = useRef(entityKey);
    const currentPreview =
        preview?.type === entity.type && preview.id === entity.id
            ? preview
            : null;

    useEffect(() => {
        activeEntityKey.current = entityKey;
        let active = true;
        startTransition(async () => {
            if (!active || activeEntityKey.current !== entityKey) return;
            setPreview(null);
            setPendingAction(null);
            setReason("");
            const next = await getDataManagementPreview(targetType, targetId);
            if (active && activeEntityKey.current === entityKey) {
                setPreview(next);
            }
        });
        return () => {
            active = false;
        };
    }, [entityKey, targetId, targetType]);

    const openAction = (action: ManagedActionKey) => {
        if (action === "permanent-delete" && !currentPreview) return;
        if (
            action === "permanent-delete" &&
            currentPreview &&
            !isPermanentDeleteEligible(currentPreview)
        ) {
            return;
        }
        setReason("");
        setPendingAction({
            action,
            targetType: entity.type,
            targetId: entity.id,
            title: getActionLabel(action),
        });
    };

    const runAction = () => {
        if (
            !pendingAction ||
            !currentPreview ||
            pendingAction.targetId !== currentPreview.id ||
            pendingAction.targetType !== currentPreview.type
        ) {
            return;
        }
        const action = pendingAction;
        const actionInput = createDataManagementActionInput(
            action,
            currentPreview,
            reason,
        );
        startTransition(async () => {
            const result = await runDataManagementAction(
                action.targetType,
                action.action,
                actionInput,
            );
            if (activeEntityKey.current !== entityKey) return;
            if (!result.success) {
                toast.error(result.message);
                if (result.message === STALE_PREVIEW_MESSAGE) {
                    setPendingAction(null);
                    setReason("");
                    const nextPreview = await getDataManagementPreview(
                        action.targetType,
                        action.targetId,
                    );
                    if (activeEntityKey.current === entityKey) {
                        setPreview(nextPreview);
                    }
                }
                return;
            }

            toast.success(result.message);
            setPendingAction(null);
            setReason("");

            if (action.action === "permanent-delete") {
                onEntityRemoved();
                return;
            }

            const nextResults = await onRefreshSearch();
            if (activeEntityKey.current !== entityKey) return;
            const refreshed = findEntity(nextResults, entity);
            if (refreshed) onEntityUpdated(refreshed);
            const nextPreview = await getDataManagementPreview(
                action.targetType,
                action.targetId,
            );
            if (activeEntityKey.current === entityKey) setPreview(nextPreview);
        });
    };

    return (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                    <DatabaseZap className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-950">
                        จัดการข้อมูล
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-700">
                        ตรวจผลกระทบและดำเนินการโดยไม่ออกจากศูนย์ดูแลระบบ
                    </p>
                </div>
            </div>

            {isPending && !currentPreview ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดผลกระทบ
                </div>
            ) : null}

            {currentPreview ? (
                <div className="mt-5 space-y-5">
                    <ImpactGrid
                        impact={currentPreview.impact}
                        targetType={currentPreview.type}
                    />
                    <DataActionButtons preview={currentPreview} onAction={openAction} />
                    <RecentEvents preview={currentPreview} />
                </div>
            ) : null}

            <ActionDialog
                pendingAction={pendingAction}
                preview={currentPreview}
                reason={reason}
                isPending={isPending}
                onReasonChange={setReason}
                onCancel={() => {
                    setPendingAction(null);
                    setReason("");
                }}
                onConfirm={runAction}
            />
        </section>
    );
}

export function DataActionButtons({
    preview,
    onAction,
}: {
    preview: ManagedPreview;
    onAction: (action: ManagedActionKey) => void;
}) {
    const eligible = isPermanentDeleteEligible(preview);
    const eligibilityMessage = getPermanentDeleteEligibilityMessage(preview);
    const isDisableBlocked = !preview.disabledAt && preview.isTestData;
    const isMarkTestBlocked = Boolean(preview.disabledAt) && !preview.isTestData;

    return (
        <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
                <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() =>
                        onAction(preview.isTestData ? "unmark-test" : "mark-test")
                    }
                    disabled={isMarkTestBlocked}
                >
                    <Check className="h-4 w-4" />
                    {preview.isTestData
                        ? "ยกเลิกข้อมูลทดสอบ"
                        : "ตั้งเป็นข้อมูลทดสอบ"}
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() =>
                        onAction(preview.disabledAt ? "restore" : "disable")
                    }
                    disabled={isDisableBlocked}
                >
                    <ArchiveRestore className="h-4 w-4" />
                    {preview.disabledAt ? "กู้คืน" : "ปิดใช้งาน"}
                </Button>
            </div>
            {isDisableBlocked ? (
                <p className="text-xs leading-5 text-amber-800" role="status">
                    ข้อมูลทดสอบไม่สามารถปิดใช้งานหรือลบถาวรได้
                    กรุณายกเลิกสถานะข้อมูลทดสอบก่อน
                </p>
            ) : isMarkTestBlocked ? (
                <p className="text-xs leading-5 text-amber-800" role="status">
                    ต้องเปิดใช้งานข้อมูลก่อน จึงจะตั้งเป็นข้อมูลทดสอบได้
                </p>
            ) : null}
            <div className="rounded-xl border border-red-100 bg-white p-3">
                <div className="flex items-start gap-2 text-red-800">
                    <ShieldAlert className="mt-0.5 h-4 w-4" />
                    <p className="text-xs leading-5">
                        ลบถาวรใช้เฉพาะข้อมูลที่ปิดใช้งานแล้วและไม่ใช่ข้อมูลทดสอบ
                    </p>
                </div>
                <Button
                    type="button"
                    className="mt-3"
                    variant="danger"
                    fullWidth
                    disabled={!eligible}
                    onClick={() => onAction("permanent-delete")}
                >
                    <Trash2 className="h-4 w-4" />
                    ลบถาวร
                </Button>
                <p className="mt-2 text-xs leading-5 text-red-700" role="status">
                    {eligibilityMessage}
                </p>
            </div>
        </div>
    );
}

function RecentEvents({ preview }: { preview: ManagedPreview }) {
    return (
        <div>
            <h4 className="text-sm font-semibold text-gray-950">
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
