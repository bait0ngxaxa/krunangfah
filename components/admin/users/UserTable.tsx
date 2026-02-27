"use client";

import { useState, useEffect } from "react";
import {
    Users,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    School,
    GraduationCap,
    Trash2,
    Pencil,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleBadge, ProfileBadge } from "@/components/ui/badges";
import type { UserListItem } from "@/types/user-management.types";
import {
    deleteUser,
    getClassesBySchool,
    updateTeacherProfile,
} from "@/lib/actions/user-management.actions";

interface UserTableProps {
    users: UserListItem[];
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onMutated: () => void;
}

function EditClassForm({
    user,
    onSaved,
    onCancel,
}: {
    user: UserListItem;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [selectedClass, setSelectedClass] = useState(
        user.advisoryClass ?? "",
    );
    const [isLoading, setIsLoading] = useState(!!user.schoolId);
    const [isSaving, setIsSaving] = useState(false);

    // Load school classes on mount
    useEffect(() => {
        if (!user.schoolId) return;
        getClassesBySchool(user.schoolId).then((result) => {
            setClasses(result);
            setIsLoading(false);
        });
    }, [user.schoolId]);

    async function handleSave() {
        if (!selectedClass) return;
        setIsSaving(true);
        const result = await updateTeacherProfile(user.id, {
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
        <div className="mt-2.5 pt-2.5 border-t border-emerald-100 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
            <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isLoading}
                className="flex-1 min-w-0 px-3 py-1.5 border border-emerald-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none bg-white"
            >
                <option value="">เลือกห้อง</option>
                <option value="ทุกห้อง">ทุกห้อง (Admin)</option>
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

function UserCard({
    user,
    onMutated,
}: {
    user: UserListItem;
    onMutated: () => void;
}) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const isSystemAdmin = user.role === "system_admin";
    const initials = user.teacherName
        ? user.teacherName.charAt(0)
        : user.email.charAt(0).toUpperCase();

    async function handleConfirmDelete() {
        setIsDeleting(true);
        const result = await deleteUser(user.id);
        if (result.success) {
            toast.success(result.message);
            onMutated();
        } else {
            toast.error(result.message);
        }
        setIsDeleting(false);
        setShowDeleteDialog(false);
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center ring-1 ring-emerald-200/50">
                    <span className="text-sm font-bold text-emerald-600">
                        {initials}
                    </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            {user.teacherName && (
                                <p className="text-sm font-bold text-gray-800 truncate">
                                    {user.teacherName}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 truncate">
                                {user.email}
                            </p>
                        </div>
                        <RoleBadge
                            role={user.role}
                            isPrimary={user.isPrimary}
                        />
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {!isSystemAdmin && (
                            <ProfileBadge hasProfile={user.hasTeacherProfile} />
                        )}
                        {user.advisoryClass && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100">
                                <GraduationCap className="w-3 h-3" />
                                {user.advisoryClass}
                            </span>
                        )}
                        {/* Edit button — show for users with teacher profile */}
                        {user.hasTeacherProfile && !isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                                title="แก้ไขห้องที่ปรึกษา"
                            >
                                <Pencil className="w-3 h-3" />
                                แก้ไข
                            </button>
                        )}
                    </div>

                    {/* Edit Form */}
                    {isEditing && (
                        <EditClassForm
                            user={user}
                            onSaved={() => {
                                setIsEditing(false);
                                onMutated();
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                            {user.schoolName && (
                                <span className="inline-flex items-center gap-1">
                                    <School className="w-3 h-3" />
                                    {user.schoolName}
                                </span>
                            )}
                            <span>
                                สร้างเมื่อ{" "}
                                {new Date(user.createdAt).toLocaleDateString(
                                    "th-TH",
                                    {
                                        day: "numeric",
                                        month: "short",
                                        year: "2-digit",
                                    },
                                )}
                            </span>
                        </div>

                        {/* Actions — hidden for system_admin */}
                        {!isSystemAdmin && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteDialog(true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer bg-red-50 hover:bg-red-100 text-red-600"
                                title="ลบผู้ใช้"
                            >
                                <Trash2 className="w-3 h-3" />
                                ลบ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="ลบผู้ใช้ออกจากระบบ"
                message={`ต้องการลบ "${user.teacherName ?? user.email}" ออกจากระบบใช่หรือไม่? ข้อมูลทั้งหมดของผู้ใช้จะถูกลบอย่างถาวร`}
                confirmLabel="ยืนยันลบ"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </div>
    );
}

export function UserTable({
    users,
    total,
    page,
    pageSize,
    onPageChange,
    onMutated,
}: UserTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-gray-100 shadow-sm relative overflow-hidden">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-[#0BD0D9] stroke-[2.5]" />
                <span className="text-gray-900 font-extrabold">
                    ผู้ใช้งาน ({total})
                </span>
            </h2>

            {users.length === 0 ? (
                <div className="p-12 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-bold text-lg">
                        ไม่พบผู้ใช้งาน
                    </p>
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                        ลองเปลี่ยนตัวกรองหรือคำค้นหา
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {users.map((user) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                onMutated={onMutated}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                                แสดง {start + 1}–
                                {Math.min(start + pageSize, total)} จาก {total}{" "}
                                รายการ
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onPageChange(page - 1)}
                                    disabled={page <= 1}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    ก่อนหน้า
                                </button>
                                <span className="text-xs font-bold text-gray-700 px-1.5">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onPageChange(page + 1)}
                                    disabled={page >= totalPages}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ถัดไป
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
