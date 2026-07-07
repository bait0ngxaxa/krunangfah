"use client";

import { ClipboardCheck } from "lucide-react";
import type { SystemPhqRecord } from "@/lib/actions/system-admin/types";
import {
    PhqForm,
    type PhqFormValue,
} from "./SystemCareAdminForms";
import {
    DeleteReasonBox,
    EmptyState,
    RecordRow,
    RecordSection,
} from "./SystemCareRecordViews";

export function SystemCarePhqSection({
    records,
    editingRecord,
    resetTarget,
    resetReason,
    isPending,
    onEdit,
    onSave,
    onCancelEdit,
    onStartReset,
    onReasonChange,
    onCancelReset,
    onReset,
}: {
    records: SystemPhqRecord[];
    editingRecord: SystemPhqRecord | null;
    resetTarget: SystemPhqRecord | null;
    resetReason: string;
    isPending: boolean;
    onEdit: (record: SystemPhqRecord) => void;
    onSave: (value: PhqFormValue) => void;
    onCancelEdit: () => void;
    onStartReset: (record: SystemPhqRecord) => void;
    onReasonChange: (value: string) => void;
    onCancelReset: () => void;
    onReset: () => void;
}) {
    return (
        <RecordSection
            title="ผลคัดกรอง PHQ"
            icon={<ClipboardCheck className="h-4 w-4" />}
        >
            {records.map((record) => (
                <RecordRow
                    key={record.id}
                    title={`${record.academicYearLabel} รอบ ${record.assessmentRound}`}
                    subtitle={`${record.totalScore} คะแนน · ${record.riskLevel}`}
                    body={getPhqBody(record)}
                    onEdit={() => onEdit(record)}
                    onDelete={() => onStartReset(record)}
                >
                    {editingRecord?.id === record.id ? (
                        <PhqForm
                            record={record}
                            isPending={isPending}
                            onCancel={onCancelEdit}
                            onSave={onSave}
                        />
                    ) : null}
                    {resetTarget?.id === record.id ? (
                        <DeleteReasonBox
                            title={getPhqResetTitle(record)}
                            buttonLabel="ล้างผล PHQ"
                            value={resetReason}
                            isPending={isPending}
                            onChange={onReasonChange}
                            onCancel={onCancelReset}
                            onDelete={onReset}
                        />
                    ) : null}
                </RecordRow>
            ))}
            {records.length === 0 ? <EmptyState /> : null}
        </RecordSection>
    );
}

function getPhqBody(record: SystemPhqRecord): string {
    if (!record.referredToHospital) return "ยังไม่ส่งต่อโรงพยาบาล";
    return `ส่งต่อโรงพยาบาล: ${record.hospitalName ?? "-"}`;
}

function getPhqResetTitle(record: SystemPhqRecord): string {
    const base = `ล้างผล PHQ รอบ ${record.assessmentRound}`;
    if (record.assessmentRound === 1) {
        return `${base} และรอบถัดไปในปีเดียวกัน`;
    }
    return base;
}
