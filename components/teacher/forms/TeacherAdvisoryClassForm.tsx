"use client";

import { useEffect, useState } from "react";
import { Check, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";
import {
    getClassesBySchool,
    updateTeacherProfile,
} from "@/lib/actions/user-management.actions";
import { cn } from "@/lib/utils/cn";

interface AdvisoryClassOption {
    id: string;
    name: string;
}

interface TeacherAdvisoryClassFormProps {
    teacherId: string;
    initialAdvisoryClass: string | null;
    classes?: AdvisoryClassOption[];
    schoolId?: string | null;
    allClassesLabel: string;
    className?: string;
    onSaved: () => void;
    onCancel: () => void;
}

interface AdvisoryClassSelectProps {
    value: string;
    classes: AdvisoryClassOption[];
    allClassesLabel: string;
    isLoading: boolean;
    onChange: (value: string) => void;
}

interface FormActionsProps {
    isSaving: boolean;
    isLoading: boolean;
    canSave: boolean;
    onSave: () => void;
    onCancel: () => void;
}

function AdvisoryClassSelect({
    value,
    classes,
    allClassesLabel,
    isLoading,
    onChange,
}: AdvisoryClassSelectProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
            className="flex-1 min-w-0 px-3 py-1.5 border border-emerald-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none bg-white"
        >
            <option value="">เลือกห้อง</option>
            <option value="ทุกห้อง">{allClassesLabel}</option>
            {classes.map((c) => (
                <option key={c.id} value={c.name}>
                    {c.name}
                </option>
            ))}
        </select>
    );
}

function FormActions({
    isSaving,
    isLoading,
    canSave,
    onSave,
    onCancel,
}: FormActionsProps) {
    return (
        <>
            <button
                type="button"
                onClick={onSave}
                disabled={isSaving || isLoading || !canSave}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
                <Check className="w-3 h-3" />
                {isSaving ? "บันทึก..." : "บันทึก"}
            </button>
            <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
                <X className="w-3 h-3" />
            </button>
        </>
    );
}

export function TeacherAdvisoryClassForm({
    teacherId,
    initialAdvisoryClass,
    classes: initialClasses,
    schoolId,
    allClassesLabel,
    className,
    onSaved,
    onCancel,
}: TeacherAdvisoryClassFormProps) {
    const [classes, setClasses] = useState(initialClasses ?? []);
    const [selectedClass, setSelectedClass] = useState(
        initialAdvisoryClass ?? "",
    );
    const [isLoading, setIsLoading] = useState(!initialClasses && !!schoolId);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialClasses || !schoolId) return;

        getClassesBySchool(schoolId)
            .then((result) => setClasses(result))
            .catch(() => toast.error("ไม่สามารถโหลดรายชื่อห้องเรียนได้"))
            .finally(() => setIsLoading(false));
    }, [initialClasses, schoolId]);

    async function handleSave(): Promise<void> {
        if (!selectedClass) return;

        setIsSaving(true);
        const result = await updateTeacherProfile(teacherId, {
            advisoryClass: selectedClass,
        });
        setIsSaving(false);

        if (!result.success) {
            toast.error(result.message);
            return;
        }

        toast.success(result.message);
        onSaved();
    }

    return (
        <div
            className={cn(
                "mt-2 pt-2 border-t border-emerald-100 flex items-center gap-2",
                className,
            )}
        >
            <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
            <AdvisoryClassSelect
                value={selectedClass}
                classes={classes}
                allClassesLabel={allClassesLabel}
                isLoading={isLoading}
                onChange={setSelectedClass}
            />
            <FormActions
                isSaving={isSaving}
                isLoading={isLoading}
                canSave={!!selectedClass}
                onSave={handleSave}
                onCancel={onCancel}
            />
        </div>
    );
}
