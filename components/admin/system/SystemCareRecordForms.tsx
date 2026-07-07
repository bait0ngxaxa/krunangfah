"use client";

import { useState } from "react";
import type {
    SystemCounselingRecord,
    SystemHomeVisitRecord,
} from "@/lib/actions/system-admin/types";
import { FormShell, ReasonField, TextField } from "./SystemFormFields";

export interface CounselingFormValue {
    id?: string;
    sessionDate: string;
    counselorName: string;
    summary: string;
    reason: string;
}

export interface HomeVisitFormValue {
    id?: string;
    visitDate: string;
    description: string;
    nextScheduledDate: string;
    teacherName: string;
    teacherRole: string;
    reason: string;
}

export function CounselingForm({
    record,
    isPending,
    onCancel,
    onSave,
}: {
    record?: SystemCounselingRecord;
    isPending: boolean;
    onCancel: () => void;
    onSave: (value: CounselingFormValue) => void;
}) {
    const [form, setForm] = useState<CounselingFormValue>({
        id: record?.id,
        sessionDate: toDateInputValue(record?.sessionDate),
        counselorName: record?.counselorName ?? "",
        summary: record?.summary ?? "",
        reason: "",
    });

    const update = (key: keyof CounselingFormValue, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    return (
        <FormShell
            isPending={isPending}
            onCancel={onCancel}
            onSave={() => onSave(form)}
        >
            <TextField
                label="วันที่ให้คำปรึกษา"
                value={form.sessionDate}
                type="date"
                onChange={(value) => update("sessionDate", value)}
            />
            <TextField
                label="ผู้ให้คำปรึกษา"
                value={form.counselorName}
                onChange={(value) => update("counselorName", value)}
            />
            <TextField
                label="สรุป"
                value={form.summary}
                onChange={(value) => update("summary", value)}
            />
            <ReasonField
                value={form.reason}
                onChange={(value) => update("reason", value)}
            />
        </FormShell>
    );
}

export function HomeVisitForm({
    record,
    isPending,
    onCancel,
    onSave,
}: {
    record?: SystemHomeVisitRecord;
    isPending: boolean;
    onCancel: () => void;
    onSave: (value: HomeVisitFormValue) => void;
}) {
    const [form, setForm] = useState<HomeVisitFormValue>({
        id: record?.id,
        visitDate: toDateInputValue(record?.visitDate),
        description: record?.description ?? "",
        nextScheduledDate: toDateInputValue(record?.nextScheduledDate),
        teacherName: record?.teacherName ?? "",
        teacherRole: record?.teacherRole ?? "",
        reason: "",
    });

    const update = (key: keyof HomeVisitFormValue, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    return (
        <FormShell
            isPending={isPending}
            onCancel={onCancel}
            onSave={() => onSave(form)}
        >
            <TextField
                label="วันที่เยี่ยมบ้าน"
                value={form.visitDate}
                type="date"
                onChange={(value) => update("visitDate", value)}
            />
            <TextField
                label="นัดครั้งถัดไป"
                value={form.nextScheduledDate}
                type="date"
                onChange={(value) => update("nextScheduledDate", value)}
            />
            <TextField
                label="ครูเจ้าของรายการ"
                value={form.teacherName}
                onChange={(value) => update("teacherName", value)}
            />
            <TextField
                label="บทบาทครู"
                value={form.teacherRole}
                onChange={(value) => update("teacherRole", value)}
            />
            <TextField
                label="รายละเอียด"
                value={form.description}
                onChange={(value) => update("description", value)}
            />
            <ReasonField
                value={form.reason}
                onChange={(value) => update("reason", value)}
            />
        </FormShell>
    );
}

function toDateInputValue(value?: Date | string | null): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}
