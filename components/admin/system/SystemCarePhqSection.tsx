"use client";

import { ClipboardCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SystemPhqRecord } from "@/lib/actions/system-admin/types";
import { EmptyState, RecordRow, RecordSection } from "./SystemCareRecordViews";
import {
    SystemCarePhqEditForm,
    type SystemPhqEditFormState,
} from "./SystemCarePhqEditForm";
import { getPhqRiskLevelLabel } from "./labels";

export function SystemCarePhqSection({
    records,
    editTarget,
    editForm,
    isPending,
    onStartEdit,
    onEditChange,
    onCancelEdit,
    onSaveEdit,
}: {
    records: SystemPhqRecord[];
    editTarget: SystemPhqRecord | null;
    editForm: SystemPhqEditFormState | null;
    isPending: boolean;
    onStartEdit: (record: SystemPhqRecord) => void;
    onEditChange: (
        field: keyof SystemPhqEditFormState,
        value: SystemPhqEditFormState[keyof SystemPhqEditFormState],
    ) => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
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
                    subtitle={`${record.totalScore} คะแนน · ${getPhqRiskLevelLabel(record.riskLevel)}`}
                    body={getPhqBody(record)}
                    meta={record.isLatestTerm ? undefined : "แก้ไขได้เฉพาะเทอมล่าสุด"}
                    actions={record.isLatestTerm ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`แก้ไขผล PHQ รอบ ${record.assessmentRound}`}
                            title={`แก้ไขผล PHQ รอบ ${record.assessmentRound}`}
                            onClick={() => onStartEdit(record)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ) : null}
                >
                    {editTarget?.id === record.id && editForm ? (
                        <SystemCarePhqEditForm
                            title={getPhqEditTitle(record)}
                            value={editForm}
                            isPending={isPending}
                            onChange={onEditChange}
                            onCancel={onCancelEdit}
                            onSave={onSaveEdit}
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

function getPhqEditTitle(record: SystemPhqRecord): string {
    return `แก้ไขผล PHQ รอบ ${record.assessmentRound}`;
}
