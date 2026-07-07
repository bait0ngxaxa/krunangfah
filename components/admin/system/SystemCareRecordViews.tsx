import type { ReactNode } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SystemCareRecordResponse } from "@/lib/actions/system-admin/types";

export function SummaryGrid({ data }: { data: SystemCareRecordResponse }) {
    const latestPhq = data.phqResults[0];
    const latestActivity = data.activityProgress.at(-1);
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
                label="PHQ ล่าสุด"
                value={latestPhq ? `${latestPhq.totalScore} คะแนน` : "-"}
                detail={latestPhq ? `${latestPhq.riskLevel} · รอบ ${latestPhq.assessmentRound}` : "ไม่มีข้อมูล"}
            />
            <SummaryCard
                label="กิจกรรม"
                value={`${data.activityProgress.length} รายการ`}
                detail={latestActivity ? `ล่าสุด: ${latestActivity.status}` : "ไม่มีข้อมูล"}
            />
            <SummaryCard
                label="ส่งต่อ"
                value={data.referral ? "มีรายการส่งต่อ" : "-"}
                detail={data.referral?.toTeacherName ?? "ไม่มีข้อมูล"}
            />
        </div>
    );
}

export function RecordSection({
    title,
    icon,
    children,
    onAdd,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    onAdd?: () => void;
}) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    {icon}
                    {title}
                </h3>
                {onAdd ? (
                    <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
                        <Plus className="h-4 w-4" />
                        เพิ่ม
                    </Button>
                ) : null}
            </div>
            <div className="mt-3 space-y-2">{children}</div>
        </div>
    );
}

export function RecordRow({
    title,
    subtitle,
    body,
    meta,
    children,
    onEdit,
    onDelete,
}: {
    title: string;
    subtitle: string;
    body: string;
    meta?: string;
    children?: ReactNode;
    onEdit?: () => void;
    onDelete: () => void;
}) {
    return (
        <article className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900">{title}</p>
                    <p className="mt-1 text-xs font-medium text-gray-600">{subtitle}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                    {onEdit ? (
                        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ) : null}
                    <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">{body}</p>
            {meta ? <p className="mt-2 text-xs font-bold text-gray-500">{meta}</p> : null}
            {children}
        </article>
    );
}

export function EmptyState() {
    return (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-500">
            ยังไม่มีข้อมูล
        </p>
    );
}

export function DeleteReasonBox({
    title,
    buttonLabel,
    value,
    isPending,
    onChange,
    onCancel,
    onDelete,
}: {
    title: string;
    buttonLabel: string;
    value: string;
    isPending: boolean;
    onChange: (value: string) => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-extrabold text-red-900">{title}</p>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={3}
                placeholder="ระบุเหตุผลการลบ"
                className="mt-3 w-full resize-none rounded-xl border border-red-100 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-500 focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
                    ยกเลิก
                </Button>
                <Button type="button" variant="danger" disabled={isPending} onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                    {buttonLabel}
                </Button>
            </div>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <ClipboardList className="h-4 w-4" />
                {label}
            </div>
            <p className="mt-2 text-base font-extrabold text-gray-900">{value}</p>
            <p className="mt-1 truncate text-xs font-medium text-gray-600">{detail}</p>
        </div>
    );
}
