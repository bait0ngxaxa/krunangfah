"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSystemAdminTeacherProfile } from "@/lib/actions/system-admin.actions";
import { PROJECT_ROLE_OPTIONS } from "@/lib/constants/roles";
import type {
    StaffEntityResult,
    SystemEntityResult,
} from "@/lib/actions/system-admin/types";
import {
    FormShell,
    ReasonField,
    SelectField,
    TextField,
} from "./SystemFormFields";

interface SystemTeacherProfileFormProps {
    entity: StaffEntityResult;
    onSaved: (entity: SystemEntityResult) => void;
    onCancel: () => void;
}

export function SystemTeacherProfileForm({
    entity,
    onSaved,
    onCancel,
}: SystemTeacherProfileFormProps) {
    const [form, setForm] = useState(() => createInitialForm(entity));
    const [isPending, startTransition] = useTransition();

    const update = (key: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const save = () => {
        startTransition(async () => {
            const result = await updateSystemAdminTeacherProfile({
                id: entity.id,
                expectedUpdatedAt: entity.teacherUpdatedAt?.toISOString(),
                ...form,
            });
            if (!result.success || !result.updated) {
                toast.error(result.message);
                return;
            }
            toast.success(result.message);
            setForm((current) => ({ ...current, reason: "" }));
            onSaved(result.updated);
            onCancel();
        });
    };

    return (
        <section className="mt-4 rounded-xl border border-emerald-100 bg-white p-3">
            <h4 className="text-sm font-semibold text-gray-950">
                แก้ไขโปรไฟล์ครู
            </h4>
            <p className="mt-1 text-xs leading-5 text-gray-600">
                แก้ข้อมูลทั่วไปของครูโดยไม่เปลี่ยนบทบาทบัญชีหรือห้องที่ปรึกษา
            </p>
            <FormShell
                isPending={isPending}
                onCancel={() => {
                    setForm(createInitialForm(entity));
                    onCancel();
                }}
                onSave={save}
            >
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
                <TextField
                    label="อายุ"
                    value={form.age}
                    inputMode="numeric"
                    onChange={(value) => update("age", value)}
                />
                <TextField
                    label="บทบาทในโรงเรียน"
                    value={form.schoolRole}
                    onChange={(value) => update("schoolRole", value)}
                />
                <SelectField
                    label="บทบาทโครงการ"
                    value={form.projectRole}
                    options={[...PROJECT_ROLE_OPTIONS]}
                    onChange={(value) => update("projectRole", value)}
                />
                <ReasonField
                    value={form.reason}
                    onChange={(value) => update("reason", value)}
                />
            </FormShell>
        </section>
    );
}

function createInitialForm(entity: StaffEntityResult) {
    return {
        firstName: entity.firstName ?? "",
        lastName: entity.lastName ?? "",
        age: entity.age?.toString() ?? "",
        schoolRole: entity.schoolRole ?? "",
        projectRole: entity.projectRole ?? "care",
        reason: "",
    };
}
