"use client";

import { useState } from "react";
import type {
    SystemPhqRecord,
    SystemReferralRecord,
    SystemTeacherOption,
} from "@/lib/actions/system-admin/types";
import {
    FormShell,
    ReasonField,
    SelectField,
    TextField,
} from "./SystemFormFields";

export interface PhqFormValue {
    id: string;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
    q7: string;
    q8: string;
    q9: string;
    q9a: boolean;
    q9b: boolean;
    referredToHospital: boolean;
    hospitalName: string;
    reason: string;
}

export interface ReferralFormValue {
    studentId: string;
    toTeacherUserId: string;
    reason: string;
}

export function PhqForm({
    record,
    isPending,
    onCancel,
    onSave,
}: {
    record: SystemPhqRecord;
    isPending: boolean;
    onCancel: () => void;
    onSave: (value: PhqFormValue) => void;
}) {
    const [form, setForm] = useState<PhqFormValue>({
        id: record.id,
        q1: record.q1.toString(),
        q2: record.q2.toString(),
        q3: record.q3.toString(),
        q4: record.q4.toString(),
        q5: record.q5.toString(),
        q6: record.q6.toString(),
        q7: record.q7.toString(),
        q8: record.q8.toString(),
        q9: record.q9.toString(),
        q9a: record.q9a,
        q9b: record.q9b,
        referredToHospital: record.referredToHospital,
        hospitalName: record.hospitalName ?? "",
        reason: "",
    });
    const update = (key: keyof PhqFormValue, value: string | boolean) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    return (
        <FormShell isPending={isPending} onCancel={onCancel} onSave={() => onSave(form)}>
            {PHQ_FIELDS.map((field) => (
                <SelectField
                    key={field}
                    label={`ข้อ ${field.slice(1)}`}
                    value={getPhqFieldValue(form, field)}
                    options={SCORE_OPTIONS}
                    onChange={(value) => update(field, value)}
                />
            ))}
            <CheckField
                label="มีความคิดทำร้ายตัวเอง"
                checked={form.q9a}
                onChange={(value) => update("q9a", value)}
            />
            <CheckField
                label="เคยพยายามทำร้ายตัวเอง"
                checked={form.q9b}
                onChange={(value) => update("q9b", value)}
            />
            <CheckField
                label="ส่งต่อโรงพยาบาล"
                checked={form.referredToHospital}
                onChange={(value) => update("referredToHospital", value)}
            />
            <TextField
                label="ชื่อโรงพยาบาล"
                value={form.hospitalName}
                onChange={(value) => update("hospitalName", value)}
            />
            <ReasonField value={form.reason} onChange={(value) => update("reason", value)} />
        </FormShell>
    );
}

export function ReferralForm({
    studentId,
    referral,
    teacherOptions,
    isPending,
    onCancel,
    onSave,
}: {
    studentId: string;
    referral: SystemReferralRecord | null;
    teacherOptions: SystemTeacherOption[];
    isPending: boolean;
    onCancel: () => void;
    onSave: (value: ReferralFormValue) => void;
}) {
    const [form, setForm] = useState<ReferralFormValue>({
        studentId,
        toTeacherUserId: referral?.toTeacherUserId ?? "",
        reason: "",
    });
    const update = (key: keyof ReferralFormValue, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    return (
        <FormShell isPending={isPending} onCancel={onCancel} onSave={() => onSave(form)}>
            <SelectField
                label="ครูผู้รับดูแล"
                value={form.toTeacherUserId}
                options={toTeacherOptions(teacherOptions)}
                onChange={(value) => update("toTeacherUserId", value)}
            />
            <ReasonField value={form.reason} onChange={(value) => update("reason", value)} />
        </FormShell>
    );
}

function CheckField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold text-gray-800">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-emerald-200 text-emerald-600"
            />
            {label}
        </label>
    );
}

function toTeacherOptions(teachers: SystemTeacherOption[]) {
    return [
        { value: "", label: "ไม่ระบุ" },
        ...teachers.map((teacher) => ({
            value: teacher.userId,
            label: `${teacher.name} (${teacher.advisoryClass ?? teacher.role})`,
        })),
    ];
}

const PHQ_FIELDS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"] as const;
type PhqScoreField = (typeof PHQ_FIELDS)[number];

function getPhqFieldValue(form: PhqFormValue, field: PhqScoreField): string {
    switch (field) {
        case "q1":
            return form.q1;
        case "q2":
            return form.q2;
        case "q3":
            return form.q3;
        case "q4":
            return form.q4;
        case "q5":
            return form.q5;
        case "q6":
            return form.q6;
        case "q7":
            return form.q7;
        case "q8":
            return form.q8;
        case "q9":
            return form.q9;
    }
}

const SCORE_OPTIONS = [
    { value: "0", label: "ไม่มีเลย (0 คะแนน)" },
    { value: "1", label: "เป็นบางวัน (1 คะแนน)" },
    { value: "2", label: "เป็นบ่อย มากกว่า 7 วัน (2 คะแนน)" },
    { value: "3", label: "เป็นแทบทุกวัน (3 คะแนน)" },
];
