"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AlertCircle, Users, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TeacherAdvisoryClassForm } from "@/components/teacher/forms/TeacherAdvisoryClassForm";
import { deleteUser } from "@/lib/actions/user-management.actions";
import { RoleBadge } from "@/components/ui/badges";
import type { UserListItem } from "@/types/user-management.types";
import type { SchoolClassItem } from "@/types/school-setup.types";

interface SchoolTeacherListProps {
    teachers: UserListItem[];
    classes: SchoolClassItem[];
    currentUserId: string;
    onUpdated?: () => void;
}

function TeacherCard({
    teacher,
    classes,
    currentUserId,
    onUpdated,
    onDeleted,
}: {
    teacher: UserListItem;
    classes: SchoolClassItem[];
    currentUserId: string;
    onUpdated?: () => void;
    onDeleted: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const isSelf = teacher.id === currentUserId;
    const canDelete = !isSelf && !teacher.isPrimary;
    const displayName = teacher.teacherName ?? teacher.email;
    const initials = Array.from(displayName.trim()).at(0) ?? "?";

    async function handleConfirmDelete(): Promise<void> {
        if (isDeleting) return;

        setDeleteError(null);
        setIsDeleting(true);
        try {
            const result = await deleteUser(teacher.id);
            if (result.success) {
                toast.success(result.message);
                onDeleted();
                setShowDeleteDialog(false);
                return;
            }
            setDeleteError(result.message);
            toast.error(result.message);
        } catch {
            const message = "ลบครูไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
            setDeleteError(message);
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4 transition-colors">
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center ring-1 ring-emerald-200/50">
                    <span
                        className="text-sm font-bold text-emerald-700"
                        aria-hidden="true"
                    >
                        {initials}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p
                                className="break-words text-sm font-bold leading-5 text-gray-800"
                                title={displayName}
                            >
                                {displayName}
                                {isSelf && (
                                    <span className="ml-1 text-xs text-gray-600">
                                        (คุณ)
                                    </span>
                                )}
                            </p>
                            <p
                                className="break-all text-xs leading-5 text-gray-600"
                                dir="auto"
                                title={teacher.email}
                            >
                                {teacher.email}
                            </p>
                        </div>
                        <RoleBadge
                            role={teacher.role}
                            isPrimary={teacher.isPrimary}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {teacher.advisoryClass && (
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                <GraduationCap
                                    className="h-3 w-3 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {teacher.advisoryClass}
                                </span>
                            </span>
                        )}
                        {!isSelf && !isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                aria-label={`แก้ไขห้องที่ปรึกษาของ ${displayName}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                            >
                                <Pencil className="w-3 h-3" aria-hidden="true" />
                                แก้ไข
                            </button>
                        )}
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteDialog(true)}
                                aria-label={`ลบ ${displayName} ออกจากระบบ`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                title="ลบครู"
                            >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                                ลบ
                            </button>
                        )}
                    </div>

                    {deleteError && (
                        <p
                            className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-600"
                            role="status"
                            aria-live="polite"
                        >
                            <AlertCircle
                                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <span>{deleteError}</span>
                        </p>
                    )}

                    {isEditing && (
                        <TeacherAdvisoryClassForm
                            teacherId={teacher.id}
                            initialAdvisoryClass={teacher.advisoryClass}
                            classes={classes}
                            allClassesLabel="ทุกห้อง (ครูนางฟ้า)"
                            onSaved={() => {
                                setIsEditing(false);
                                onUpdated?.();
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    )}
                </div>
            </div>
            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="ลบครูออกจากระบบ"
                message={`ต้องการลบ "${displayName}" ออกจากระบบใช่หรือไม่? บัญชีนี้จะถูกปิดใช้งานและไม่สามารถเข้าสู่ระบบได้อีก`}
                confirmLabel="ยืนยันลบ"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    if (isDeleting) return;
                    setDeleteError(null);
                    setShowDeleteDialog(false);
                }}
            />
        </div>
    );
}

export function SchoolTeacherList({
    teachers: initialTeachers,
    classes,
    currentUserId,
    onUpdated,
}: SchoolTeacherListProps) {
    const [teachers, setTeachers] = useOptimistic(
        initialTeachers,
        (_, nextTeachers: UserListItem[]) => nextTeachers,
    );
    const [, startTransition] = useTransition();

    function handleDeleted(teacherId: string) {
        startTransition(() => {
            setTeachers(
                teachers.filter((teacher) => teacher.id !== teacherId),
            );
            onUpdated?.();
        });
    }

    return (
        <div aria-live="polite">
            {teachers.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-xl border-2 border-dashed border-emerald-200">
                    <Users
                        className="w-8 h-8 text-gray-500 mx-auto mb-2"
                        aria-hidden="true"
                    />
                    <p className="font-bold text-gray-700">
                        ยังไม่มีครูที่ลงทะเบียนแล้ว
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
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
                            onDeleted={() => handleDeleted(t.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
