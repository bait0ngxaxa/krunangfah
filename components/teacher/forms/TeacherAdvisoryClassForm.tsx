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
    hasError: boolean;
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
    hasError,
    onChange,
}: AdvisoryClassSelectProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
            aria-label="เลือกห้องที่ปรึกษา"
            aria-invalid={hasError}
            aria-describedby={hasError ? "advisory-class-error" : undefined}
            className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-gray-50"
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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (initialClasses || !schoolId) return;

        let isActive = true;
        getClassesBySchool(schoolId)
            .then((result) => {
                if (!isActive) return;
                setClasses(result);
            })
            .catch(() => {
                if (!isActive) return;
                const message = "ไม่สามารถโหลดรายชื่อห้องเรียนได้";
                setErrorMessage(message);
                toast.error(message);
            })
            .finally(() => {
                if (!isActive) return;
                setIsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [initialClasses, schoolId]);

    async function handleSave(): Promise<void> {
        if (!selectedClass || isSaving) return;

        setErrorMessage(null);
        setIsSaving(true);
        try {
            const result = await updateTeacherProfile(teacherId, {
                advisoryClass: selectedClass,
            });

            if (!result.success) {
                setErrorMessage(result.message);
                toast.error(result.message);
                return;
            }

            toast.success(result.message);
            onSaved();
        } catch {
            const message = "บันทึกห้องที่ปรึกษาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            className={cn(
                "mt-2 flex flex-wrap items-center gap-2 border-t border-emerald-100 pt-2",
                className,
            )}
        >
            <GraduationCap
                className="w-4 h-4 shrink-0 text-emerald-600"
                aria-hidden="true"
            />
            <AdvisoryClassSelect
                value={selectedClass}
                classes={classes}
                allClassesLabel={allClassesLabel}
                isLoading={isLoading}
                hasError={!!errorMessage}
                onChange={(value) => {
                    setSelectedClass(value);
                    setErrorMessage(null);
                }}
            />
            <FormActions
                isSaving={isSaving}
                isLoading={isLoading}
                canSave={!!selectedClass}
                onSave={handleSave}
                onCancel={onCancel}
            />
            {errorMessage && (
                <p
                    id="advisory-class-error"
                    className="basis-full text-xs leading-5 text-red-600"
                    role="status"
                    aria-live="polite"
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
