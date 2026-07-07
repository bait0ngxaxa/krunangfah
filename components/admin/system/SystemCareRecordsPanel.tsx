"use client";

import { useEffect, useState, useTransition } from "react";
import {
    Home,
    Loader2,
    MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
    deleteSystemAdminCareRecord,
    getSystemStudentCareRecords,
    saveSystemAdminCounseling,
    saveSystemAdminHomeVisit,
} from "@/lib/actions/system-admin.actions";
import type {
    SystemCareRecordResponse,
    SystemCounselingRecord,
    SystemHomeVisitRecord,
} from "@/lib/actions/system-admin/types";
import {
    CounselingForm,
    type CounselingFormValue,
    HomeVisitForm,
    type HomeVisitFormValue,
} from "./SystemCareRecordForms";
import {
    DeleteReasonBox,
    EmptyState,
    RecordRow,
    RecordSection,
    SummaryGrid,
} from "./SystemCareRecordViews";
import { SystemCareAdminPanel } from "./SystemCareAdminPanel";

type FormState =
    | { type: "counseling"; record?: SystemCounselingRecord }
    | { type: "homeVisit"; record?: SystemHomeVisitRecord }
    | null;

type DeleteTarget = {
    type: "counselingSession" | "homeVisit";
    id: string;
    label: string;
} | null;

export function SystemCareRecordsPanel({ studentId }: { studentId: string }) {
    const [data, setData] = useState<SystemCareRecordResponse | null>(null);
    const [formState, setFormState] = useState<FormState>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let isActive = true;
        startTransition(async () => {
            const result = await getSystemStudentCareRecords({ studentId });
            if (isActive) setData(result);
        });
        return () => {
            isActive = false;
        };
    }, [studentId]);

    const saveCounseling = (value: CounselingFormValue) => {
        startTransition(async () => {
            const result = await saveSystemAdminCounseling({ ...value, studentId });
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => updateCounselingData(current, updated));
            setFormState(null);
            toast.success(result.message);
        });
    };

    const saveHomeVisit = (value: HomeVisitFormValue) => {
        startTransition(async () => {
            const result = await saveSystemAdminHomeVisit({ ...value, studentId });
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => updateHomeVisitData(current, updated));
            setFormState(null);
            toast.success(result.message);
        });
    };

    const softDelete = () => {
        if (!deleteTarget) return;
        startTransition(async () => {
            const result = await deleteSystemAdminCareRecord(deleteTarget.type, {
                id: deleteTarget.id,
                reason: deleteReason,
            });
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            setData((current) => removeRecord(current, deleteTarget));
            setDeleteTarget(null);
            setDeleteReason("");
            toast.success(result.message);
        });
    };

    if (!data) {
        return (
            <section className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูลดูแลนักเรียน
                </div>
            </section>
        );
    }

    return (
        <section className="mt-5 space-y-4">
            <SummaryGrid data={data} />
            <SystemCareAdminPanel
                studentId={studentId}
                data={data}
                setData={setData}
            />
            <RecordSection
                title="การให้คำปรึกษา"
                icon={<MessageSquare className="h-4 w-4" />}
                onAdd={() => setFormState({ type: "counseling" })}
            >
                {data.counselingSessions.map((record) => (
                    <RecordRow
                        key={record.id}
                        title={`ครั้งที่ ${record.sessionNumber}`}
                        subtitle={`${formatDate(record.sessionDate)} · ${record.counselorName}`}
                        body={record.summary}
                        onEdit={() => setFormState({ type: "counseling", record })}
                        onDelete={() => {
                            setDeleteTarget({
                                type: "counselingSession",
                                id: record.id,
                                label: `การให้คำปรึกษาครั้งที่ ${record.sessionNumber}`,
                            });
                            setDeleteReason("");
                        }}
                    >
                        {formState?.type === "counseling" &&
                        formState.record?.id === record.id ? (
                            <CounselingForm
                                record={record}
                                isPending={isPending}
                                onCancel={() => setFormState(null)}
                                onSave={saveCounseling}
                            />
                        ) : null}
                    </RecordRow>
                ))}
                {data.counselingSessions.length === 0 ? <EmptyState /> : null}
            </RecordSection>
            {formState?.type === "counseling" && !formState.record ? (
                <CounselingForm
                    record={formState.record}
                    isPending={isPending}
                    onCancel={() => setFormState(null)}
                    onSave={saveCounseling}
                />
            ) : null}

            <RecordSection
                title="เยี่ยมบ้าน"
                icon={<Home className="h-4 w-4" />}
                onAdd={() => setFormState({ type: "homeVisit" })}
            >
                {data.homeVisits.map((record) => (
                    <RecordRow
                        key={record.id}
                        title={`ครั้งที่ ${record.visitNumber}`}
                        subtitle={`${formatDate(record.visitDate)} · ${record.teacherName}`}
                        body={record.description}
                        meta={`รูปภาพ ${record.photoCount} รูป`}
                        onEdit={() => setFormState({ type: "homeVisit", record })}
                        onDelete={() => {
                            setDeleteTarget({
                                type: "homeVisit",
                                id: record.id,
                                label: `เยี่ยมบ้านครั้งที่ ${record.visitNumber}`,
                            });
                            setDeleteReason("");
                        }}
                    >
                        {formState?.type === "homeVisit" &&
                        formState.record?.id === record.id ? (
                            <HomeVisitForm
                                record={record}
                                isPending={isPending}
                                onCancel={() => setFormState(null)}
                                onSave={saveHomeVisit}
                            />
                        ) : null}
                    </RecordRow>
                ))}
                {data.homeVisits.length === 0 ? <EmptyState /> : null}
            </RecordSection>
            {formState?.type === "homeVisit" && !formState.record ? (
                <HomeVisitForm
                    record={formState.record}
                    isPending={isPending}
                    onCancel={() => setFormState(null)}
                    onSave={saveHomeVisit}
                />
            ) : null}

            {deleteTarget ? (
                <DeleteReasonBox
                    title={`ลบ ${deleteTarget.label}`}
                    buttonLabel="ลบรายการ"
                    value={deleteReason}
                    isPending={isPending}
                    onChange={setDeleteReason}
                    onCancel={() => setDeleteTarget(null)}
                    onDelete={softDelete}
                />
            ) : null}
        </section>
    );
}

function updateCounselingData(
    current: SystemCareRecordResponse | null,
    record: SystemCounselingRecord,
): SystemCareRecordResponse | null {
    if (!current) return current;
    return {
        ...current,
        counselingSessions: upsertById(current.counselingSessions, record).sort(
            (a, b) => a.sessionNumber - b.sessionNumber,
        ),
    };
}

function updateHomeVisitData(
    current: SystemCareRecordResponse | null,
    record: SystemHomeVisitRecord,
): SystemCareRecordResponse | null {
    if (!current) return current;
    return {
        ...current,
        homeVisits: upsertById(current.homeVisits, record).sort(
            (a, b) => b.visitNumber - a.visitNumber,
        ),
    };
}

function removeRecord(
    current: SystemCareRecordResponse | null,
    target: NonNullable<DeleteTarget>,
): SystemCareRecordResponse | null {
    if (!current) return current;
    if (target.type === "counselingSession") {
        return {
            ...current,
            counselingSessions: current.counselingSessions.filter(
                (record) => record.id !== target.id,
            ),
        };
    }
    return {
        ...current,
        homeVisits: current.homeVisits.filter((record) => record.id !== target.id),
    };
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
    if (items.some((current) => current.id === item.id)) {
        return items.map((current) => (current.id === item.id ? item : current));
    }
    return [item, ...items];
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
