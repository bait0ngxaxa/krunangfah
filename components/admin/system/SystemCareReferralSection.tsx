"use client";

import { Send, Trash2 } from "lucide-react";
import type { SystemReferralRecord } from "@/lib/actions/system-admin/types";
import { Button } from "@/components/ui/Button";
import { ReferralHistoryTimeline } from "@/components/student/referral/ReferralHistoryTimeline";
import { EmptyState, RecordSection } from "./SystemCareRecordViews";

export function SystemCareReferralSection({
    referral,
    referralHistory,
    onDelete,
}: {
    referral: SystemReferralRecord | null;
    referralHistory: SystemReferralRecord[];
    onDelete?: () => void;
}) {
    const records = referralHistory.length
        ? referralHistory
        : referral
          ? [referral]
          : [];

    return (
        <RecordSection title="ประวัติการส่งต่อ" icon={<Send className="h-4 w-4" />}>
            {records.length > 0 ? (
                <ReferralHistoryTimeline
                    records={records}
                    renderActions={(record) =>
                        record.id === referral?.id && onDelete ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label="ลบการส่งต่อปัจจุบัน"
                                onClick={onDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : null
                    }
                />
            ) : (
                <EmptyState />
            )}
        </RecordSection>
    );
}
