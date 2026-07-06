import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImpactGrid } from "./ImpactGrid";
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
    if (!pendingAction || !preview) return null;
    const isDelete = pendingAction.action === "permanent-delete";
    const disabled = reason.trim().length < 3 || isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-start gap-3">
                    <AlertTriangle
                        className={
                            isDelete
                                ? "h-6 w-6 text-red-600"
                                : "h-6 w-6 text-emerald-600"
                        }
                    />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {pendingAction.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                            ตรวจผลกระทบ กรอกเหตุผล แล้วกดยืนยัน
                        </p>
                    </div>
                </div>
                {isDelete ? <ImpactGrid impact={preview.impact} /> : null}
                <label className="mt-4 block">
                    <span className="text-sm font-bold text-gray-800">
                        เหตุผลการจัดการข้อมูล
                    </span>
                    <textarea
                        value={reason}
                        onChange={(event) => onReasonChange(event.target.value)}
                        placeholder="เช่น ลบโรงเรียนทดสอบที่สร้างเพื่อทดลองระบบ"
                        className="mt-2 min-h-28 w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        ยกเลิก
                    </Button>
                    <Button
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
