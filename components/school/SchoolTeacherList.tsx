"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Users, GraduationCap, Pencil, Trash2 } from "lucide-react";
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
    const isSelf = teacher.id === currentUserId;
    const canDelete = !isSelf && !teacher.isPrimary;
    const initials = teacher.teacherName?.charAt(0) ?? "?";

    async function handleConfirmDelete() {
        setIsDeleting(true);
        const result = await deleteUser(teacher.id);
        if (result.success) {
            toast.success(result.message);
            onDeleted();
        } else {
            toast.error(result.message);
        }
        setIsDeleting(false);
        setShowDeleteDialog(false);
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 transition-colors">
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
                        <RoleBadge
                            role={teacher.role}
                            isPrimary={teacher.isPrimary}
                        />
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
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteDialog(true)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                title="ลบครู"
                            >
                                <Trash2 className="w-3 h-3" />
                                ลบ
                            </button>
                        )}
                    </div>

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
                message={`ต้องการลบ "${teacher.teacherName ?? teacher.email}" ออกจากระบบใช่หรือไม่? บัญชีนี้จะถูกปิดใช้งานและไม่สามารถเข้าสู่ระบบได้อีก`}
                confirmLabel="ยืนยันลบ"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
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
                            onDeleted={() => handleDeleted(t.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
