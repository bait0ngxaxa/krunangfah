"use client";

import { useId, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
    STUDENT_IDENTIFIER_CLEAR_REASON_OPTION,
    STUDENT_IDENTIFIER_EDIT_REASON_OPTIONS,
} from "@/lib/constants/student-identifier";
import { getStudentIdentifierForEdit, updateStudentIdentifier } from "@/lib/actions/student/mutations";
import { isValidNationalId, normalizeNationalIdInput } from "@/lib/utils/national-id";

export function StudentIdentifierEditor({ studentId, activePhqResultId }: {
    studentId: string;
    activePhqResultId: string;
}): ReactElement {
    const inputId = useId();
    const reasonId = useId();
    const [pending, startTransition] = useTransition();
    const [identifier, setIdentifier] = useState<{ masked: string | null; updatedAt: string } | null>(null);
    const [value, setValue] = useState("");
    const [reason, setReason] = useState("");
    const [confirmClear, setConfirmClear] = useState(false);
    const reasonOptions = confirmClear ? [STUDENT_IDENTIFIER_CLEAR_REASON_OPTION] : STUDENT_IDENTIFIER_EDIT_REASON_OPTIONS;
    const hasReason = reasonOptions.some((option) => option.value === reason);

    function close(): void {
        setIdentifier(null);
        setValue("");
        setReason("");
        setConfirmClear(false);
    }

    function load(): void {
        startTransition(async () => {
            const result = await getStudentIdentifierForEdit(studentId);
            if (result.success) setIdentifier(result);
            else toast.error(result.message);
        });
    }

    function save(nationalId: string | null): void {
        if (!identifier || pending || !hasReason) return;
        startTransition(async () => {
            const result = await updateStudentIdentifier(studentId, {
                nationalId, expectedUpdatedAt: identifier.updatedAt, reason,
            }, { activePhqResultId });
            if (result.success) {
                close();
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        });
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!confirmClear && isValidNationalId(value)) save(value);
    }

    function updateValue(input: string): void {
        const normalized = normalizeNationalIdInput(input);
        if (normalized !== null) setValue(normalized);
    }

    if (!identifier) {
        return <Button type="button" variant="secondary" disabled={pending} onClick={load}>
            {pending ? "กำลังโหลดเลขประจำตัว…" : "จัดการเลขประจำตัว"}
        </Button>;
    }

    return (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-busy={pending}>
            <p className="text-sm text-slate-700">
                {identifier.masked ? `เลขปัจจุบัน ${identifier.masked}` : "ยังไม่มีเลขประจำตัว"}
            </p>
            <label htmlFor={inputId} className="block text-sm font-semibold text-slate-900">เลขประจำตัวใหม่</label>
            <input
                id={inputId}
                value={value}
                onChange={(event) => updateValue(event.target.value)}
                onPaste={(event) => {
                    event.preventDefault();
                    updateValue(event.clipboardData.getData("text"));
                }}
                disabled={pending || confirmClear}
                maxLength={14}
                autoComplete="off"
                placeholder="ตัวเลข 13 หลัก หรือ G ตามด้วยตัวเลข 13 หลัก"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:max-w-sm"
            />
            <label htmlFor={reasonId} className="block text-sm font-semibold text-slate-900">เหตุผลที่เปลี่ยนเลขประจำตัว</label>
            <select
                id={reasonId}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={pending}
                required
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:max-w-sm"
            >
                <option value="">เลือกเหตุผล</option>
                {reasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {confirmClear && <p className="text-sm text-slate-700">ยืนยันการล้างเลขประจำตัวของนักเรียนคนนี้</p>}
            <div className="flex flex-wrap gap-2">
                {confirmClear ? (
                    <Button type="button" variant="secondary" disabled={pending || !hasReason} onClick={() => save(null)}>ยืนยันการล้างเลข</Button>
                ) : (
                    <>
                        <Button type="submit" variant="primary" disabled={pending || !hasReason || !isValidNationalId(value)}>บันทึกเลขประจำตัว</Button>
                        {identifier.masked && <Button type="button" variant="secondary" disabled={pending} onClick={() => {
                            setReason("");
                            setConfirmClear(true);
                        }}>ล้างเลขประจำตัว</Button>}
                    </>
                )}
                <Button type="button" variant="secondary" disabled={pending} onClick={close}>ยกเลิก</Button>
            </div>
        </form>
    );
}
