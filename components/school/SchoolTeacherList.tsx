"use client";

import { useState, useEffect } from "react";
import {
    Users,
    GraduationCap,
    ShieldCheck,
    Pencil,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { updateTeacherProfile } from "@/lib/actions/user-management.actions";
import { USER_ROLE_LABELS } from "@/lib/constants/roles";
import type { UserListItem } from "@/types/user-management.types";
import type { SchoolClassItem } from "@/types/school-setup.types";

interface SchoolTeacherListProps {
    teachers: UserListItem[];
    classes: SchoolClassItem[];
    currentUserId: string;
    onUpdated?: () => void;
}

function EditClassForm({
    teacher,
    classes,
    onSaved,
    onCancel,
}: {
    teacher: UserListItem;
    classes: SchoolClassItem[];
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [selectedClass, setSelectedClass] = useState(
        teacher.advisoryClass ?? "",
    );
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        if (!selectedClass) return;
        setIsSaving(true);
        const result = await updateTeacherProfile(teacher.id, {
            advisoryClass: selectedClass,
        });
        if (result.success) {
            toast.success(result.message);
            onSaved();
        } else {
            toast.error(result.message);
        }
        setIsSaving(false);
    }

    return (
        <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
            <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 border border-emerald-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none bg-white"
            >
                <option value="">เลือกห้อง</option>
                <option value="ทุกห้อง">ทุกห้อง (ครูนางฟ้า)</option>
                {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                        {c.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !selectedClass}
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
        </div>
    );
}

function TeacherCard({
    teacher,
    classes,
    currentUserId,
    onUpdated,
}: {
    teacher: UserListItem;
    classes: SchoolClassItem[];
    currentUserId: string;
    onUpdated?: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const isSelf = teacher.id === currentUserId;
    const initials = teacher.teacherName?.charAt(0) ?? "?";

    return (
        <div className="p-4 bg-white rounded-xl border border-emerald-100 hover:border-emerald-200 transition-colors">
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center ring-1 ring-emerald-200/50">
                    <span className="text-sm font-bold text-emerald-600">
                        {initials}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">
                                {teacher.teacherName}
                                {isSelf && (
                                    <span className="text-xs text-gray-400 ml-1">
                                        (คุณ)
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {teacher.email}
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                            <ShieldCheck className="w-3 h-3" />
                            {USER_ROLE_LABELS[teacher.role] ?? teacher.role}
                            {teacher.isPrimary && " (Primary)"}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {teacher.advisoryClass && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100">
                                <GraduationCap className="w-3 h-3" />
                                {teacher.advisoryClass}
                            </span>
                        )}
                        {!isSelf && !isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                            >
                                <Pencil className="w-3 h-3" />
                                แก้ไข
                            </button>
                        )}
                    </div>

                    {isEditing && (
                        <EditClassForm
                            teacher={teacher}
                            classes={classes}
                            onSaved={() => {
                                setIsEditing(false);
                                onUpdated?.();
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export function SchoolTeacherList({
    teachers: initialTeachers,
    classes,
    currentUserId,
    onUpdated,
}: SchoolTeacherListProps) {
    const [teachers, setTeachers] = useState(initialTeachers);

    // Sync when parent re-renders with new data
    useEffect(() => {
        setTeachers(initialTeachers);
    }, [initialTeachers]);

    return (
        <div>
            {teachers.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-xl border-2 border-dashed border-emerald-200">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-bold">
                        ยังไม่มีครูที่ลงทะเบียนแล้ว
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        ครูจะปรากฏที่นี่หลังจากรับคำเชิญและสร้างโปรไฟล์
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {teachers.map((t) => (
                        <TeacherCard
                            key={t.id}
                            teacher={t}
                            classes={classes}
                            currentUserId={currentUserId}
                            onUpdated={onUpdated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
