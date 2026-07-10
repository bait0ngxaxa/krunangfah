"use client";

import { useState, useTransition } from "react";
import { ArchiveRestore, ShieldAlert, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
    permanentlyDeleteSystemAdminStaffAccount,
    restoreSystemAdminStaffAccount,
} from "@/lib/actions/system-admin-staff-account.actions";
import { deleteUser } from "@/lib/actions/user-management.actions";
import type {
    StaffEntityResult,
    SystemEntityResult,
    SystemSearchResult,
} from "@/lib/actions/system-admin/types";
import {
    StaffAccountActionDialog,
    type StaffAccountDialogAction,
} from "./StaffAccountActionDialog";

interface SystemStaffAccountActionsProps {
    entity: StaffEntityResult;
    onEntityUpdated: (entity: SystemEntityResult) => void;
    onEntityRemoved: () => void;
    onRefreshSearch: () => Promise<SystemSearchResult>;
}

interface DialogState {
    action: StaffAccountDialogAction | null;
    reason: string;
    confirmation: string;
}

const EMPTY_DIALOG: DialogState = { action: null, reason: "", confirmation: "" };

export function SystemStaffAccountActions(
    props: SystemStaffAccountActionsProps,
) {
    const controller = useStaffAccountLifecycle(props);
    if (props.entity.role === "system_admin") return null;

    return (
        <div className="mt-5 border-t border-emerald-100 pt-4">
            <AccountStatus entity={props.entity} />
            <AccountActionButtons
                entity={props.entity}
                isPending={controller.isPending}
                onDisable={() => controller.setShowDisableDialog(true)}
                onOpenAction={controller.openActionDialog}
            />
            <ConfirmDialog
                isOpen={controller.showDisableDialog}
                title="ปิดบัญชีบุคลากร"
                message={`ต้องการปิดบัญชี "${getDisplayName(props.entity)}" ใช่หรือไม่? ข้อมูลจะยังอยู่และ System Admin สามารถกู้คืนได้`}
                confirmLabel="ยืนยันปิดบัญชี"
                isLoading={controller.isPending}
                onConfirm={controller.handleDisable}
                onCancel={() => controller.setShowDisableDialog(false)}
            />
            <LifecycleDialog
                entity={props.entity}
                controller={controller}
            />
        </div>
    );
}

function useStaffAccountLifecycle(props: SystemStaffAccountActionsProps) {
    const [showDisableDialog, setShowDisableDialog] = useState(false);
    const [dialog, setDialog] = useState<DialogState>(EMPTY_DIALOG);
    const [isPending, startTransition] = useTransition();
    const refreshEntity = () => refreshStaffEntity(props);
    const openActionDialog = (action: StaffAccountDialogAction) =>
        setDialog({ ...EMPTY_DIALOG, action });
    const closeActionDialog = () => setDialog(EMPTY_DIALOG);
    const handleDisable = () => startTransition(async () => {
        await disableStaffAccount(props.entity.id, refreshEntity);
        setShowDisableDialog(false);
    });
    const handleLifecycleAction = () => {
        if (!dialog.action) return;
        startTransition(() => runLifecycleAction(
            props,
            dialog,
            closeActionDialog,
            refreshEntity,
        ));
    };
    return {
        dialog,
        setDialog,
        showDisableDialog,
        setShowDisableDialog,
        isPending,
        openActionDialog,
        closeActionDialog,
        handleDisable,
        handleLifecycleAction,
    };
}

async function disableStaffAccount(
    userId: string,
    refreshEntity: () => Promise<void>,
): Promise<void> {
    const result = await deleteUser(userId);
    if (!result.success) {
        toast.error(result.message);
        return;
    }
    toast.success(result.message);
    await refreshEntity();
}

async function runLifecycleAction(
    props: SystemStaffAccountActionsProps,
    dialog: DialogState,
    closeDialog: () => void,
    refreshEntity: () => Promise<void>,
): Promise<void> {
    const result = dialog.action === "restore"
        ? await restoreSystemAdminStaffAccount({
              id: props.entity.id,
              reason: dialog.reason,
          })
        : await permanentlyDeleteSystemAdminStaffAccount({
              id: props.entity.id,
              reason: dialog.reason,
              confirmation: dialog.confirmation,
          });
    if (!result.success) {
        toast.error(result.message);
        return;
    }
    toast.success(result.message);
    closeDialog();
    if (dialog.action === "permanent-delete") {
        props.onEntityRemoved();
        return;
    }
    await refreshEntity();
}

async function refreshStaffEntity(
    props: SystemStaffAccountActionsProps,
): Promise<void> {
    const nextResults = await props.onRefreshSearch();
    const refreshed = nextResults.staffs.find(
        (item) => item.id === props.entity.id,
    );
    if (refreshed) props.onEntityUpdated(refreshed);
}

function AccountStatus({ entity }: { entity: StaffEntityResult }) {
    return (
        <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <div>
                <h4 className="text-sm font-semibold text-gray-950">สถานะบัญชี</h4>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                    {entity.deletedAt
                        ? "บัญชีถูกปิดและไม่สามารถเข้าสู่ระบบได้"
                        : "ปิดบัญชีเพื่อหยุดการเข้าใช้โดยยังเก็บข้อมูลไว้"}
                </p>
            </div>
        </div>
    );
}

function AccountActionButtons({
    entity,
    isPending,
    onDisable,
    onOpenAction,
}: {
    entity: StaffEntityResult;
    isPending: boolean;
    onDisable: () => void;
    onOpenAction: (action: StaffAccountDialogAction) => void;
}) {
    const isProtected = entity.role === "system_admin" || entity.isPrimary;
    if (entity.deletedAt) {
        return (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" disabled={isPending}
                    onClick={() => onOpenAction("restore")}>
                    <ArchiveRestore className="h-4 w-4" /> กู้คืนบัญชี
                </Button>
                {!isProtected ? (
                    <Button type="button" variant="danger" disabled={isPending}
                        onClick={() => onOpenAction("permanent-delete")}>
                        <Trash2 className="h-4 w-4" /> ลบถาวร
                    </Button>
                ) : null}
            </div>
        );
    }
    return (
        <Button type="button" className="mt-3" variant="danger"
            disabled={isPending || isProtected} onClick={onDisable}>
            <UserX className="h-4 w-4" /> ปิดบัญชี
        </Button>
    );
}

function LifecycleDialog({
    entity,
    controller,
}: {
    entity: StaffEntityResult;
    controller: ReturnType<typeof useStaffAccountLifecycle>;
}) {
    return (
        <StaffAccountActionDialog
            action={controller.dialog.action}
            email={entity.email}
            reason={controller.dialog.reason}
            confirmation={controller.dialog.confirmation}
            isPending={controller.isPending}
            onReasonChange={(reason) =>
                controller.setDialog((current) => ({ ...current, reason }))
            }
            onConfirmationChange={(confirmation) =>
                controller.setDialog((current) => ({ ...current, confirmation }))
            }
            onCancel={controller.closeActionDialog}
            onConfirm={controller.handleLifecycleAction}
        />
    );
}

function getDisplayName(entity: StaffEntityResult): string {
    return entity.teacherName ?? entity.name ?? entity.email;
}
