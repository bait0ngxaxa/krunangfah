"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    updateSystemAdminSchool,
    updateSystemAdminStudent,
} from "@/lib/actions/system-admin.actions";
import type {
    SchoolEntityResult,
    StudentEntityResult,
    SystemEntityResult,
} from "@/lib/actions/system-admin/types";
import { getGenderLabel, getStudentStatusLabel } from "./labels";
import {
    FormShell,
    ReasonField,
    SelectField,
    TextField,
    type SelectOption,
} from "./SystemFormFields";
import { normalizeNationalIdInput } from "@/lib/utils/national-id";

interface SystemEditFormProps {
    entity: SchoolEntityResult | StudentEntityResult;
    onSaved: (entity: SystemEntityResult) => void;
    onCancel: () => void;
}

export function SystemEditForm({
    entity,
    onSaved,
    onCancel,
}: SystemEditFormProps) {
    if (entity.type === "school") {
        return (
            <SchoolEditForm
                entity={entity}
                onSaved={onSaved}
                onCancel={onCancel}
            />
        );
    }
    return (
        <StudentEditForm
            entity={entity}
            onSaved={onSaved}
            onCancel={onCancel}
        />
    );
}

function SchoolEditForm({ entity, onSaved, onCancel }: SystemEditFormProps) {
    const school = entity as SchoolEntityResult;
    const [name, setName] = useState(school.name);
    const [province, setProvince] = useState(school.province ?? "");
    const [reason, setReason] = useState("");
    const [isPending, startTransition] = useTransition();

    const save = () => {
        startTransition(async () => {
            const result = await updateSystemAdminSchool({
                id: school.id,
                expectedUpdatedAt: school.updatedAt.toISOString(),
                name,
                province,
                reason,
            });
            if (!result.success || !result.updated) {
                toast.error(result.message);
                return;
            }
            toast.success(result.message);
            onSaved(result.updated);
            onCancel();
        });
    };

    return (
        <FormShell
            isPending={isPending}
            onCancel={onCancel}
            onSave={save}
        >
            <TextField label="ชื่อโรงเรียน" value={name} onChange={setName} />
            <TextField label="จังหวัด" value={province} onChange={setProvince} />
            <ReasonField value={reason} onChange={setReason} />
        </FormShell>
    );
}

function StudentEditForm({ entity, onSaved, onCancel }: SystemEditFormProps) {
    const student = entity as StudentEntityResult;
    const [form, setForm] = useState({
        studentId: student.studentId,
        nationalId: student.nationalId ?? "",
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender ?? "",
        age: student.age?.toString() ?? "",
        class: getInitialClassValue(student),
        status: student.status,
        reason: "",
    });
    const [isPending, startTransition] = useTransition();

    const update = (key: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const save = () => {
        startTransition(async () => {
            const result = await updateSystemAdminStudent({
                id: student.id,
                expectedUpdatedAt: student.updatedAt.toISOString(),
                ...form,
            });
            if (!result.success || !result.updated) {
                toast.error(result.message);
                return;
            }
            toast.success(result.message);
            onSaved(result.updated);
            onCancel();
        });
    };

    return (
        <FormShell
            isPending={isPending}
            onCancel={onCancel}
            onSave={save}
        >
            <TextField
                label="รหัสนักเรียน"
                value={form.studentId}
                onChange={(value) => update("studentId", value)}
            />
            <TextField
                label="เลขบัตรประชาชน"
                value={form.nationalId}
                onChange={(value) => {
                    const normalized = normalizeNationalIdInput(value);
                    if (normalized !== null) update("nationalId", normalized);
                }}
                onPaste={(value) => {
                    const normalized = normalizeNationalIdInput(value);
                    if (normalized !== null) update("nationalId", normalized);
                }}
                maxLength={14}
                placeholder="ตัวเลข 13 หลัก หรือ G ตามด้วยตัวเลข 13 หลัก"
            />
            <TextField
                label="ชื่อ"
                value={form.firstName}
                onChange={(value) => update("firstName", value)}
            />
            <TextField
                label="นามสกุล"
                value={form.lastName}
                onChange={(value) => update("lastName", value)}
            />
            <SelectField
                label="เพศ"
                value={form.gender}
                options={[
                    { value: "", label: getGenderLabel(null) },
                    { value: "MALE", label: getGenderLabel("MALE") },
                    { value: "FEMALE", label: getGenderLabel("FEMALE") },
                ]}
                onChange={(value) => update("gender", value)}
            />
            <TextField
                label="อายุ"
                value={form.age}
                inputMode="numeric"
                onChange={(value) => update("age", value)}
            />
            <SelectField
                label="ห้อง"
                value={form.class}
                options={getClassOptions(student)}
                onChange={(value) => update("class", value)}
            />
            <SelectField
                label="สถานะนักเรียน"
                value={form.status}
                options={[
                    { value: "ACTIVE", label: getStudentStatusLabel("ACTIVE") },
                    { value: "RESIGNED", label: getStudentStatusLabel("RESIGNED") },
                    { value: "TRANSFERRED", label: getStudentStatusLabel("TRANSFERRED") },
                    { value: "GRADUATED", label: getStudentStatusLabel("GRADUATED") },
                ]}
                onChange={(value) => update("status", value)}
            />
            <ReasonField
                value={form.reason}
                onChange={(value) => update("reason", value)}
            />
        </FormShell>
    );
}

function getInitialClassValue(student: StudentEntityResult): string {
    const hasCurrentClass = student.classOptions.some(
        (option) => option.name === student.class,
    );
    return hasCurrentClass ? student.class : "";
}

function getClassOptions(student: StudentEntityResult): SelectOption[] {
    if (student.classOptions.length === 0) {
        return [
            {
                value: "",
                label: "ยังไม่มีห้องเรียนที่สร้างไว้",
                disabled: true,
            },
        ];
    }

    const options = student.classOptions.map((option) => ({
        value: option.name,
        label: option.name,
    }));

    if (getInitialClassValue(student)) return options;
    return [{ value: "", label: "เลือกห้องเรียน" }, ...options];
}
