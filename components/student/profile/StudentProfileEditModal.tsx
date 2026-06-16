"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    Save,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { updateStudentProfile } from "@/lib/actions/student/mutations";
import {
    StudentProfileFields,
    type StudentProfileFormState,
} from "./StudentProfileEditFields";

interface EditableStudent {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    nationalId?: string | null;
    gender?: string | null;
    age?: number | null;
    class: string;
    status?: string | null;
}

type SavedStudentProfile = EditableStudent;

interface StudentProfileEditModalProps {
    student: EditableStudent;
    activePhqResultId: string;
    isOpen: boolean;
    onClose: () => void;
    onSaved: (student: SavedStudentProfile) => void;
}

interface StudentProfileSubmitPayload
    extends Omit<StudentProfileFormState, "age" | "gender"> {
    gender: string | null;
    age: number | null;
}

function createInitialState(student: EditableStudent): StudentProfileFormState {
    return {
        studentId: student.studentId ?? "",
        nationalId: student.nationalId ?? "",
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender ?? "",
        age: student.age?.toString() ?? "",
        class: student.class,
        status: student.status ?? "ACTIVE",
    };
}

function hasFormChanges(
    current: StudentProfileFormState,
    baseline: StudentProfileFormState,
): boolean {
    return (
        current.studentId !== baseline.studentId ||
        current.nationalId !== baseline.nationalId ||
        current.firstName !== baseline.firstName ||
        current.lastName !== baseline.lastName ||
        current.gender !== baseline.gender ||
        current.age !== baseline.age ||
        current.class !== baseline.class ||
        current.status !== baseline.status
    );
}

function toSubmitPayload(
    state: StudentProfileFormState,
): StudentProfileSubmitPayload {
    return {
        ...state,
        gender: state.gender === "" ? null : state.gender,
        age: state.age.trim() === "" ? null : Number(state.age),
    };
}

export function StudentProfileEditModal({
    student,
    activePhqResultId,
    isOpen,
    onClose,
    onSaved,
}: StudentProfileEditModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState(() => createInitialState(student));
    const [baselineForm, setBaselineForm] = useState(() =>
        createInitialState(student),
    );
    const hasChanges = hasFormChanges(form, baselineForm);

    if (typeof document === "undefined" || !isOpen) return null;

    function updateField(
        field: keyof StudentProfileFormState,
        value: string,
    ): void {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleClose(): void {
        if (isPending) return;
        setForm(baselineForm);
        onClose();
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (isPending || !hasChanges) return;

        startTransition(async () => {
            const result = await updateStudentProfile(
                student.id,
                toSubmitPayload(form),
                { activePhqResultId },
            );
            if (!result.success) {
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            const nextForm = createInitialState(result.student);
            onSaved(result.student);
            setBaselineForm(nextForm);
            setForm(nextForm);
            onClose();
            router.refresh();
        });
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4"
            onClick={handleClose}
        >
            <form
                onSubmit={handleSubmit}
                className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                aria-busy={isPending}
                aria-label="แก้ไขข้อมูลนักเรียน"
                onClick={(event) => event.stopPropagation()}
            >
                <CloseButton isPending={isPending} onClose={handleClose} />
                <div className="overflow-y-auto px-4 pb-4 pt-12 sm:px-5">
                    <StudentProfileFields
                        form={form}
                        isPending={isPending}
                        updateField={updateField}
                    />
                </div>
                <ModalFooter
                    hasChanges={hasChanges}
                    isPending={isPending}
                    onClose={handleClose}
                />
            </form>
        </div>,
        document.body,
    );
}

function CloseButton({
    isPending,
    onClose,
}: {
    isPending: boolean;
    onClose: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            aria-label="ปิด"
        >
            <X className="h-4 w-4" aria-hidden="true" />
        </button>
    );
}

function ModalFooter({
    hasChanges,
    isPending,
    onClose,
}: {
    hasChanges: boolean;
    isPending: boolean;
    onClose: () => void;
}) {
    return (
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isPending}
            >
                ยกเลิก
            </Button>
            <Button
                type="submit"
                variant="primary"
                disabled={isPending || !hasChanges}
            >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
        </div>
    );
}
