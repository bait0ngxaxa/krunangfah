"use client";

import { Home, MessageSquare } from "lucide-react";
import type { SystemCareRecordResponse } from "@/lib/actions/system-admin/types";
import {
    DeleteReasonBox,
    EmptyState,
    RecordRow,
    RecordSection,
} from "./SystemCareRecordViews";

export type DeleteTarget = {
    type: "counselingSession" | "homeVisit";
    id: string;
    expectedUpdatedAt: Date;
    label: string;
} | null;

export function CareRecordSections({
    data,
    deleteTarget,
    deleteReason,
    isPending,
    onStartDelete,
    onReasonChange,
    onCancelDelete,
    onDelete,
}: SectionProps) {
    return (
        <>
            <CounselingSection
                data={data}
                deleteTarget={deleteTarget}
                deleteReason={deleteReason}
                isPending={isPending}
                onStartDelete={onStartDelete}
                onReasonChange={onReasonChange}
                onCancelDelete={onCancelDelete}
                onDelete={onDelete}
            />
            <HomeVisitSection
                data={data}
                deleteTarget={deleteTarget}
                deleteReason={deleteReason}
                isPending={isPending}
                onStartDelete={onStartDelete}
                onReasonChange={onReasonChange}
                onCancelDelete={onCancelDelete}
                onDelete={onDelete}
            />
        </>
    );
}

function CounselingSection(props: SectionProps) {
    const { data, onStartDelete } = props;
    return (
        <RecordSection title="การให้คำปรึกษา" icon={<MessageSquare className="h-4 w-4" />}>
            {data.counselingSessions.map((record) => (
                <RecordRow
                    key={record.id}
                    title={`ครั้งที่ ${record.sessionNumber}`}
                    subtitle={`${formatDate(record.sessionDate)} · ${record.counselorName}`}
                    body={record.summary}
                    onDelete={() => onStartDelete({
                        type: "counselingSession",
                        id: record.id,
                        expectedUpdatedAt: record.updatedAt,
                        label: `การให้คำปรึกษาครั้งที่ ${record.sessionNumber}`,
                    })}
                >
                    <InlineDeleteReason
                        {...props}
                        expectedType="counselingSession"
                        expectedId={record.id}
                    />
                </RecordRow>
            ))}
            {data.counselingSessions.length === 0 ? <EmptyState /> : null}
        </RecordSection>
    );
}

function HomeVisitSection(props: SectionProps) {
    const { data, onStartDelete } = props;
    return (
        <RecordSection title="เยี่ยมบ้าน" icon={<Home className="h-4 w-4" />}>
            {data.homeVisits.map((record) => (
                <RecordRow
                    key={record.id}
                    title={`ครั้งที่ ${record.visitNumber}`}
                    subtitle={`${formatDate(record.visitDate)} · ${record.teacherName}`}
                    body={record.description}
                    meta={`รูปภาพ ${record.photoCount} รูป`}
                    onDelete={() => onStartDelete({
                        type: "homeVisit",
                        id: record.id,
                        expectedUpdatedAt: record.updatedAt,
                        label: `เยี่ยมบ้านครั้งที่ ${record.visitNumber}`,
                    })}
                >
                    <InlineDeleteReason
                        {...props}
                        expectedType="homeVisit"
                        expectedId={record.id}
                    />
                </RecordRow>
            ))}
            {data.homeVisits.length === 0 ? <EmptyState /> : null}
        </RecordSection>
    );
}

function InlineDeleteReason({
    deleteTarget,
    expectedType,
    expectedId,
    deleteReason,
    isPending,
    onReasonChange,
    onCancelDelete,
    onDelete,
}: InlineDeleteReasonProps) {
    if (!isDeleteTarget(deleteTarget, expectedType, expectedId)) return null;
    return (
        <DeleteReasonBox
            title={`ลบ ${deleteTarget.label}`}
            buttonLabel="ลบรายการ"
            value={deleteReason}
            isPending={isPending}
            onChange={onReasonChange}
            onCancel={onCancelDelete}
            onDelete={onDelete}
        />
    );
}

function isDeleteTarget(
    target: DeleteTarget,
    type: NonNullable<DeleteTarget>["type"],
    id: string,
): target is NonNullable<DeleteTarget> {
    return target?.type === type && target.id === id;
}

function formatDate(value: Date | string | null): string {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

type SectionProps = {
    data: SystemCareRecordResponse;
    deleteTarget: DeleteTarget;
    deleteReason: string;
    isPending: boolean;
    onStartDelete: (target: NonNullable<DeleteTarget>) => void;
    onReasonChange: (value: string) => void;
    onCancelDelete: () => void;
    onDelete: () => void;
};

type InlineDeleteReasonProps = SectionProps & {
    expectedType: NonNullable<DeleteTarget>["type"];
    expectedId: string;
};
