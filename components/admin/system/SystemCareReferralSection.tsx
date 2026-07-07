"use client";

import type { ReactNode } from "react";
import { Send } from "lucide-react";
import type {
    SystemReferralRecord,
    SystemTeacherOption,
} from "@/lib/actions/system-admin/types";
import {
    ReferralForm,
    type ReferralFormValue,
} from "./SystemCareAdminForms";
import {
    EmptyState,
    RecordRow,
    RecordSection,
} from "./SystemCareRecordViews";

export function SystemCareReferralSection({
    studentId,
    referral,
    teacherOptions,
    isEditing,
    isPending,
    onAdd,
    onEdit,
    onDelete,
    onCancel,
    onSave,
}: {
    studentId: string;
    referral: SystemReferralRecord | null;
    teacherOptions: SystemTeacherOption[];
    isEditing: boolean;
    isPending: boolean;
    onAdd: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCancel: () => void;
    onSave: (value: ReferralFormValue) => void;
}) {
    return (
        <RecordSection
            title="การส่งต่อ"
            icon={<Send className="h-4 w-4" />}
            onAdd={onAdd}
        >
            {referral ? (
                <ReferralRow
                    referral={referral}
                    onEdit={onEdit}
                    onDelete={onDelete}
                >
                    {isEditing ? (
                        <ReferralForm
                            studentId={studentId}
                            referral={referral}
                            teacherOptions={teacherOptions}
                            isPending={isPending}
                            onCancel={onCancel}
                            onSave={onSave}
                        />
                    ) : null}
                </ReferralRow>
            ) : (
                <>
                    <EmptyState />
                    {isEditing ? (
                        <ReferralForm
                            studentId={studentId}
                            referral={referral}
                            teacherOptions={teacherOptions}
                            isPending={isPending}
                            onCancel={onCancel}
                            onSave={onSave}
                        />
                    ) : null}
                </>
            )}
        </RecordSection>
    );
}

function ReferralRow({
    referral,
    children,
    onEdit,
    onDelete,
}: {
    referral: SystemReferralRecord;
    children?: ReactNode;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <RecordRow
            title="รายการส่งต่อปัจจุบัน"
            subtitle={`จาก ${referral.fromTeacherName ?? "-"} ไป ${referral.toTeacherName ?? "-"}`}
            body={`สร้างเมื่อ ${formatDate(referral.createdAt)}`}
            onEdit={onEdit}
            onDelete={onDelete}
        >
            {children}
        </RecordRow>
    );
}

function formatDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
