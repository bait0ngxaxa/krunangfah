"use client";

import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PHQA_SCORE_OPTIONS } from "@/lib/constants/phq-score-labels";
import type { SystemPhqRecord } from "@/lib/actions/system-admin/types";

export interface SystemPhqEditFormState {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
    q6: number;
    q7: number;
    q8: number;
    q9: number;
    q9a: boolean;
    q9b: boolean;
    referredToHospital: boolean;
    hospitalName: string;
    reason: string;
}

type Field = keyof SystemPhqEditFormState;
type Value = SystemPhqEditFormState[Field];

const SCORE_FIELDS = [
    ["q1", "ข้อ 1"],
    ["q2", "ข้อ 2"],
    ["q3", "ข้อ 3"],
    ["q4", "ข้อ 4"],
    ["q5", "ข้อ 5"],
    ["q6", "ข้อ 6"],
    ["q7", "ข้อ 7"],
    ["q8", "ข้อ 8"],
    ["q9", "ข้อ 9"],
] as const;

export function createPhqEditFormState(
    record: SystemPhqRecord,
): SystemPhqEditFormState {
    return {
        q1: record.q1,
        q2: record.q2,
        q3: record.q3,
        q4: record.q4,
        q5: record.q5,
        q6: record.q6,
        q7: record.q7,
        q8: record.q8,
        q9: record.q9,
        q9a: record.q9a,
        q9b: record.q9b,
        referredToHospital: record.referredToHospital,
        hospitalName: record.hospitalName ?? "",
        reason: "",
    };
}

export function SystemCarePhqEditForm({
    title,
    value,
    isPending,
    onChange,
    onCancel,
    onSave,
}: {
    title: string;
    value: SystemPhqEditFormState;
    isPending: boolean;
    onChange: (field: Field, value: Value) => void;
    onCancel: () => void;
    onSave: () => void;
}) {
    return (
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-extrabold text-emerald-950">{title}</p>
            <ScoreGrid value={value} onChange={onChange} />
            <SafetyGrid value={value} onChange={onChange} />
            {value.referredToHospital ? (
                <HospitalNameField value={value.hospitalName} onChange={onChange} />
            ) : null}
            <ReasonField value={value.reason} onChange={onChange} />
            <FormActions
                isPending={isPending}
                onCancel={onCancel}
                onSave={onSave}
            />
        </div>
    );
}

function ScoreGrid({
    value,
    onChange,
}: {
    value: SystemPhqEditFormState;
    onChange: (field: Field, value: Value) => void;
}) {
    return (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {SCORE_FIELDS.map(([field, label]) => (
                <ScoreSelect
                    key={field}
                    label={label}
                    value={getScoreValue(value, field)}
                    onChange={(next) => onChange(field, next)}
                />
            ))}
        </div>
    );
}

function SafetyGrid({
    value,
    onChange,
}: {
    value: SystemPhqEditFormState;
    onChange: (field: Field, value: Value) => void;
}) {
    return (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <CheckboxField
                label="คิดทำร้ายตัวเอง"
                checked={value.q9a}
                onChange={(checked) => onChange("q9a", checked)}
            />
            <CheckboxField
                label="เคยพยายามทำร้ายตัวเอง"
                checked={value.q9b}
                onChange={(checked) => onChange("q9b", checked)}
            />
            <CheckboxField
                label="ส่งต่อโรงพยาบาล"
                checked={value.referredToHospital}
                onChange={(checked) => onChange("referredToHospital", checked)}
            />
        </div>
    );
}

function HospitalNameField({
    value,
    onChange,
}: {
    value: string;
    onChange: (field: Field, value: Value) => void;
}) {
    return (
        <label className="mt-3 block">
            <span className="text-sm font-bold text-emerald-950">
                ชื่อโรงพยาบาล
            </span>
            <input
                value={value}
                onChange={(event) => onChange("hospitalName", event.target.value)}
                className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}

function ReasonField({
    value,
    onChange,
}: {
    value: string;
    onChange: (field: Field, value: Value) => void;
}) {
    return (
        <label className="mt-3 block">
            <span className="text-sm font-bold text-emerald-950">
                เหตุผลการแก้ไข
            </span>
            <textarea
                value={value}
                onChange={(event) => onChange("reason", event.target.value)}
                rows={3}
                placeholder="เช่น แก้คะแนน PHQ จากเอกสารต้นฉบับ"
                className="mt-2 w-full resize-none rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}

function FormActions({
    isPending,
    onCancel,
    onSave,
}: {
    isPending: boolean;
    onCancel: () => void;
    onSave: () => void;
}) {
    return (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
                <X className="h-4 w-4" />
                ยกเลิก
            </Button>
            <Button type="button" variant="primary" disabled={isPending} onClick={onSave}>
                <Save className="h-4 w-4" />
                บันทึกผล PHQ
            </Button>
        </div>
    );
}

function ScoreSelect({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="text-xs font-bold text-emerald-950">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
                {PHQA_SCORE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function getScoreValue(
    value: SystemPhqEditFormState,
    field: (typeof SCORE_FIELDS)[number][0],
): number {
    switch (field) {
        case "q1":
            return value.q1;
        case "q2":
            return value.q2;
        case "q3":
            return value.q3;
        case "q4":
            return value.q4;
        case "q5":
            return value.q5;
        case "q6":
            return value.q6;
        case "q7":
            return value.q7;
        case "q8":
            return value.q8;
        case "q9":
            return value.q9;
    }
}

function CheckboxField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-bold text-emerald-950">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-200"
            />
            {label}
        </label>
    );
}
