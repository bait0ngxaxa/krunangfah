"use client";

import { Send } from "lucide-react";
import type { SystemReferralRecord } from "@/lib/actions/system-admin/types";
import {
    EmptyState,
    RecordRow,
    RecordSection,
} from "./SystemCareRecordViews";

export function SystemCareReferralSection({
    referral,
    onDelete,
}: {
    referral: SystemReferralRecord | null;
    onDelete: () => void;
}) {
    return (
        <RecordSection
            title="การส่งต่อ"
            icon={<Send className="h-4 w-4" />}
        >
            {referral ? (
                <ReferralRow
                    referral={referral}
                    onDelete={onDelete}
                />
            ) : (
                <EmptyState />
            )}
        </RecordSection>
    );
}

function ReferralRow({
    referral,
    onDelete,
}: {
    referral: SystemReferralRecord;
    onDelete: () => void;
}) {
    return (
        <RecordRow
            title="รายการส่งต่อปัจจุบัน"
            subtitle={`จาก ${referral.fromTeacherName ?? "-"} ไป ${referral.toTeacherName ?? "-"}`}
            body={`สร้างเมื่อ ${formatDate(referral.createdAt)}`}
            onDelete={onDelete}
        />
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
