import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImpactGrid } from "./ImpactGrid";
import {
    getManagedPreviewTitle,
    isPermanentDeleteEligible,
} from "./types";
import type { ManagedPreview, PendingDataManagementAction } from "./types";

export function ActionDialog({
    pendingAction,
    preview,
    reason,
    isPending,
    onReasonChange,
    onCancel,
    onConfirm,
}: {
    pendingAction: PendingDataManagementAction | null;
    preview: ManagedPreview | null;
    reason: string;
    isPending: boolean;
    onReasonChange: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    if (
        !pendingAction ||
        !preview ||
        pendingAction.targetId !== preview.id ||
        pendingAction.targetType !== preview.type
    ) {
        return null;
    }

    const isDelete = pendingAction.action === "permanent-delete";
    const isEligible = !isDelete || isPermanentDeleteEligible(preview);
    const disabled =
        reason.trim().length < 3 ||
        isPending ||
        !isEligible ||
        !preview;
    const reasonLabel = isDelete
        ? "เหตุผลการลบถาวร"
        : "เหตุผลการจัดการข้อมูล";
    const reasonPlaceholder = isDelete
        ? "เช่น ลบข้อมูลซ้ำหรือข้อมูลผิดที่ยืนยันแล้ว"
        : "ระบุเหตุผลเพื่อให้ตรวจสอบย้อนหลังได้";
    const titleId = "data-management-action-title";
    const descriptionId = "data-management-action-description";
    const targetTitle = getManagedPreviewTitle(preview);
    const targetDetails =
        preview.type === "school"
            ? preview.province ?? "ไม่ระบุจังหวัด"
            : preview.school.name + " · " + preview.class + " · รหัส " + preview.studentId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div
                className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle
                        className={
                            isDelete
                                ? "h-6 w-6 text-red-600"
                                : "h-6 w-6 text-emerald-600"
                        }
                    />
                    <div>
                        <h2
                            id={titleId}
                            className="text-lg font-bold text-gray-900"
                        >
                            {pendingAction.title}
                        </h2>
                        <p id={descriptionId} className="mt-1 text-sm text-gray-600">
                            {targetTitle} · {targetDetails}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                            ตรวจผลกระทบ ใส่เหตุผล แล้วกดยืนยัน
                        </p>
                    </div>
                </div>
                {isDelete ? (
                    <div className="mt-4 space-y-3">
                        <p className="text-sm font-semibold text-gray-900">
                            ผลกระทบล่าสุดจากฐานข้อมูล
                        </p>
                        <ImpactGrid impact={preview.impact} targetType={preview.type} />
                        <p className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                            การดำเนินการนี้จะลบข้อมูลและรายการที่เกี่ยวข้องออกจากฐานข้อมูลอย่างถาวร ไม่สามารถกู้คืนได้
                        </p>
                    </div>
                ) : null}
                <label className="mt-4 block">
                    <span className="text-sm font-bold text-gray-800">
                        {reasonLabel}
                    </span>
                    <textarea
                        value={reason}
                        required
                        maxLength={1000}
                        onChange={(event) => onReasonChange(event.target.value)}
                        placeholder={reasonPlaceholder}
                        className="mt-2 min-h-28 w-full resize-none rounded-xl border border-emerald-100 p-3 text-sm text-gray-900 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                </label>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        type="button"
                        variant={isDelete ? "danger" : "primary"}
                        onClick={onConfirm}
                        disabled={disabled}
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {pendingAction.title}
                    </Button>
                </div>
            </div>
        </div>
    );
}
