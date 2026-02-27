"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    addTeacherToRoster,
    removeFromRoster,
    updateRosterEntry,
} from "@/lib/actions/teacher-roster.actions";
import {
    teacherRosterSchema,
    ADMIN_ADVISORY_CLASS,
    type TeacherRosterFormData,
} from "@/lib/validations/teacher-roster.validation";
import type { TeacherRosterItem } from "@/types/school-setup.types";
import type { UseTeacherRosterReturn } from "./types";

interface UseTeacherRosterParams {
    initialRoster: TeacherRosterItem[];
    onUpdate?: (roster: TeacherRosterItem[]) => void;
}

export function useTeacherRoster({
    initialRoster,
    onUpdate,
}: UseTeacherRosterParams): UseTeacherRosterReturn {
    const [roster, setRoster] = useState<TeacherRosterItem[]>(initialRoster);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<TeacherRosterFormData>({
        resolver: zodResolver(teacherRosterSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            age: undefined as unknown as number,
            userRole: undefined,
            advisoryClass: "",
            schoolRole: "",
            projectRole: undefined,
        },
    });

    const userRoleValue = useWatch({ control, name: "userRole" }) ?? "";
    const advisoryClassValue =
        useWatch({ control, name: "advisoryClass" }) ?? "";

    // Auto-set advisory class for school_admin
    useEffect(() => {
        if (userRoleValue === "school_admin") {
            setValue("advisoryClass", ADMIN_ADVISORY_CLASS, {
                shouldValidate: true,
            });
        } else if (
            userRoleValue === "class_teacher" &&
            advisoryClassValue === ADMIN_ADVISORY_CLASS
        ) {
            setValue("advisoryClass", "", { shouldValidate: false });
        }
    }, [userRoleValue, setValue, advisoryClassValue]);

    function syncUpdate(updated: TeacherRosterItem[]): void {
        setRoster(updated);
        onUpdate?.(updated);
    }

    function openAddForm(): void {
        setEditingId(null);
        reset();
        setShowForm(true);
    }

    function startEdit(teacher: TeacherRosterItem): void {
        setEditingId(teacher.id);
        setShowForm(true);
        setErrorMsg(null);

        // Pre-fill form with existing data
        setValue("firstName", teacher.firstName);
        setValue("lastName", teacher.lastName);
        setValue("email", teacher.email || "");
        setValue("age", teacher.age);
        setValue(
            "userRole",
            teacher.userRole as "school_admin" | "class_teacher",
        );
        setValue("advisoryClass", teacher.advisoryClass);
        setValue("schoolRole", teacher.schoolRole);
        setValue(
            "projectRole",
            teacher.projectRole as "lead" | "care" | "coordinate",
        );
    }

    function cancelForm(): void {
        setShowForm(false);
        setEditingId(null);
        reset();
    }

    async function onSubmit(data: TeacherRosterFormData): Promise<void> {
        setErrorMsg(null);

        if (editingId) {
            // Update existing entry
            const result = await updateRosterEntry(editingId, data);
            if (!result.success) {
                setErrorMsg(result.message);
                toast.error(result.message || "อัพเดตข้อมูลไม่สำเร็จ");
                return;
            }
            if (result.data) {
                const updatedEntry = result.data;
                if (!updatedEntry) return;
                const updated = roster
                    .map((t) => (t.id === editingId ? updatedEntry : t))
                    .sort((a, b) =>
                        `${a.firstName} ${a.lastName}`.localeCompare(
                            `${b.firstName} ${b.lastName}`,
                            "th",
                        ),
                    );
                syncUpdate(updated);
                toast.success(
                    `อัพเดตข้อมูลครู "${updatedEntry.firstName} ${updatedEntry.lastName}" สำเร็จ`,
                );
            }
        } else {
            // Add new entry
            const result = await addTeacherToRoster(data);
            if (!result.success) {
                setErrorMsg(result.message);
                toast.error(result.message || "เพิ่มครูไม่สำเร็จ");
                return;
            }
            if (result.data) {
                const updated = [...roster, result.data].sort((a, b) =>
                    `${a.firstName} ${a.lastName}`.localeCompare(
                        `${b.firstName} ${b.lastName}`,
                        "th",
                    ),
                );
                syncUpdate(updated);
                toast.success(
                    `เพิ่มครู "${result.data.firstName} ${result.data.lastName}" สำเร็จ`,
                );
            }
        }

        reset();
        setShowForm(false);
        setEditingId(null);
    }

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    function requestRemove(id: string, name: string): void {
        setDeleteTarget({ id, name });
    }

    function cancelRemove(): void {
        setDeleteTarget(null);
    }

    async function confirmRemove(): Promise<void> {
        if (!deleteTarget) return;

        setIsRemoving(true);
        setErrorMsg(null);
        const result = await removeFromRoster(deleteTarget.id);
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "ลบครูไม่สำเร็จ");
            setIsRemoving(false);
            setDeleteTarget(null);
            return;
        }
        const removedName = deleteTarget.name;
        startTransition(() => {
            syncUpdate(roster.filter((t) => t.id !== deleteTarget.id));
        });
        toast.success(`ลบครู "${removedName}" สำเร็จ`);
        setIsRemoving(false);
        setDeleteTarget(null);
    }

    return {
        roster,
        errorMsg,
        showForm,
        editingId,
        isSubmitting,
        userRoleValue,
        advisoryClassValue,
        register,
        errors,
        handleSubmit,
        setValue,
        openAddForm,
        startEdit,
        cancelForm,
        onSubmit,
        deleteTarget,
        isRemoving,
        requestRemove,
        confirmRemove,
        cancelRemove,
    };
}
