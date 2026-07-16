import { ArchiveRestore, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type StaffAccountDialogAction =
    | "disable"
    | "restore"
    | "permanent-delete";

interface StaffAccountActionDialogProps {
    action: StaffAccountDialogAction | null;
    email: string;
    reason: string;
    confirmation: string;
    isPending: boolean;
    onReasonChange: (value: string) => void;
    onConfirmationChange: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export function StaffAccountActionDialog(
    props: StaffAccountActionDialogProps,
) {
    if (!props.action) return null;
    const isPermanentDelete = props.action === "permanent-delete";
    const isDisable = props.action === "disable";
    const disabled = isConfirmDisabled(props, isPermanentDelete);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div
                className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
                role={isPermanentDelete ? "alertdialog" : "dialog"}
                aria-modal="true"
                aria-labelledby="staff-account-action-title"
                aria-describedby="staff-account-action-description"
            >
                <DialogHeader
                    isDisable={isDisable}
                    isPermanentDelete={isPermanentDelete}
                />
                <ReasonField
                    reason={props.reason}
                    onChange={props.onReasonChange}
                />
                {isPermanentDelete ? (
                    <ConfirmationField
                        email={props.email}
                        confirmation={props.confirmation}
                        onChange={props.onConfirmationChange}
                    />
                ) : null}
                <DialogButtons
                    isDisable={isDisable}
                    isPermanentDelete={isPermanentDelete}
                    isPending={props.isPending}
                    disabled={disabled}
                    onCancel={props.onCancel}
                    onConfirm={props.onConfirm}
                />
            </div>
        </div>
    );
}

function DialogHeader({
    isDisable,
    isPermanentDelete,
}: {
    isDisable: boolean;
    isPermanentDelete: boolean;
}) {
    const title = isDisable
        ? "ปิดบัญชีบุคลากร"
        : isPermanentDelete
          ? "ลบถาวรบัญชี"
          : "กู้คืนบัญชี";
    const description = isDisable
        ? "บัญชีจะเข้าสู่สถานะปิดใช้งานและ session ที่กำลังใช้งานจะถูกเพิกถอน"
        : isPermanentDelete
          ? "ข้อมูลบัญชีและข้อมูลการทำงานที่เกี่ยวข้องจะถูกลบจากฐานข้อมูลและกู้คืนไม่ได้"
          : "บัญชีจะกลับเข้าสู่ระบบและใช้งานตามสิทธิ์เดิมได้";
    return (
        <div className="flex items-start gap-3">
            {isDisable || isPermanentDelete ? (
                <ShieldAlert className="h-6 w-6 shrink-0 text-red-600" />
            ) : (
                <ArchiveRestore className="h-6 w-6 shrink-0 text-emerald-600" />
            )}
            <div>
                <h2
                    id="staff-account-action-title"
                    className="text-lg font-bold text-gray-900"
                >
                    {title}
                </h2>
                <p
                    id="staff-account-action-description"
                    className="mt-1 text-sm text-gray-600"
                >
                    {description}
                </p>
            </div>
        </div>
    );
}

function ReasonField({
    reason,
    onChange,
}: {
    reason: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="mt-5 block">
            <span className="text-sm font-bold text-gray-800">
                เหตุผลการจัดการบัญชี
            </span>
            <textarea
                value={reason}
                onChange={(event) => onChange(event.target.value)}
                placeholder="ระบุเหตุผลเพื่อให้ตรวจสอบย้อนหลังได้"
                className="mt-2 min-h-28 w-full resize-none rounded-xl border border-emerald-100 p-3 text-sm text-gray-900 outline-none transition-base placeholder:text-gray-500 hover:border-emerald-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}

function ConfirmationField({
    email,
    confirmation,
    onChange,
}: {
    email: string;
    confirmation: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="mt-4 block">
            <span className="text-sm font-bold text-red-800">
                พิมพ์อีเมล {email} เพื่อยืนยัน
            </span>
            <input
                type="email"
                value={confirmation}
                onChange={(event) => onChange(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
        </label>
    );
}

function DialogButtons({
    isDisable,
    isPermanentDelete,
    isPending,
    disabled,
    onCancel,
    onConfirm,
}: {
    isDisable: boolean;
    isPermanentDelete: boolean;
    isPending: boolean;
    disabled: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={isPending}
                onClick={onCancel}>
                ยกเลิก
            </Button>
            <Button type="button" variant={isDisable || isPermanentDelete ? "danger" : "primary"}
                disabled={disabled} onClick={onConfirm}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isDisable ? "ปิดบัญชี" : isPermanentDelete ? "ลบถาวร" : "กู้คืนบัญชี"}
            </Button>
        </div>
    );
}

function isConfirmDisabled(
    props: StaffAccountActionDialogProps,
    isPermanentDelete: boolean,
): boolean {
    const confirmationMatches =
        props.confirmation.trim().toLowerCase() === props.email.toLowerCase();
    return props.reason.trim().length < 3 ||
        props.isPending ||
        (isPermanentDelete && !confirmationMatches);
}
