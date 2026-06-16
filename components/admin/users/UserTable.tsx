"use client";

import { useState } from "react";
import {
    AlertCircle,
    Search,
    Users,
    UserCircle,
    School,
    GraduationCap,
    Trash2,
    Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SectionCard, SectionCardHeader } from "@/components/ui/SectionCard";
import { TeacherAdvisoryClassForm } from "@/components/teacher/forms/TeacherAdvisoryClassForm";
import { RoleBadge, ProfileBadge } from "@/components/ui/badges";
import { TableMetaRow } from "@/components/ui/TableMetaRow";
import type { UserListItem } from "@/types/user-management.types";
import { deleteUser } from "@/lib/actions/user-management.actions";

interface UserTableProps {
    users: UserListItem[];
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onMutated: () => void;
    hasActiveFilters?: boolean;
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
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const isSystemAdmin = user.role === "system_admin";
    const displayName = user.teacherName ?? user.email;
    const initials = Array.from(displayName.trim()).at(0) ?? "?";

    async function handleConfirmDelete(): Promise<void> {
        if (isDeleting) return;

        setDeleteError(null);
        setIsDeleting(true);
        try {
            const result = await deleteUser(user.id);
            if (result.success) {
                toast.success(result.message);
                onMutated();
                setShowDeleteDialog(false);
                return;
            }
            setDeleteError(result.message);
            toast.error(result.message);
        } catch {
            const message = "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
            setDeleteError(message);
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center ring-1 ring-emerald-200/50">
                    <span
                        className="text-sm font-bold text-emerald-700"
                        aria-hidden="true"
                    >
                        {initials}
                    </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            {user.teacherName && (
                                <p
                                    className="break-words text-sm font-bold leading-5 text-gray-800"
                                    title={user.teacherName}
                                    dir="auto"
                                >
                                    {user.teacherName}
                                </p>
                            )}
                            <p
                                className="break-all text-xs leading-5 text-gray-600"
                                title={user.email}
                                dir="auto"
                            >
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
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                <GraduationCap
                                    className="h-3 w-3 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {user.advisoryClass}
                                </span>
                            </span>
                        )}
                        {/* Edit button — show for users with teacher profile */}
                        {user.hasTeacherProfile && !isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                aria-label={`แก้ไขห้องที่ปรึกษาของ ${displayName}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                                title="แก้ไขห้องที่ปรึกษา"
                            >
                                <Pencil className="w-3 h-3" aria-hidden="true" />
                                แก้ไข
                            </button>
                        )}
                    </div>

                    {/* Edit Form */}
                    {isEditing && (
                        <TeacherAdvisoryClassForm
                            teacherId={user.id}
                            initialAdvisoryClass={user.advisoryClass}
                            schoolId={user.schoolId}
                            allClassesLabel="ทุกห้อง (Admin)"
                            className="mt-2.5 pt-2.5"
                            onSaved={() => {
                                setIsEditing(false);
                                onMutated();
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    )}

                    {/* Footer */}
                    <div className="mt-2.5 flex flex-col gap-2 border-t border-gray-50 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-gray-600">
                            {user.schoolName && (
                                <span className="inline-flex min-w-0 items-center gap-1">
                                    <School
                                        className="h-3 w-3 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span
                                        className="truncate"
                                        title={user.schoolName}
                                    >
                                        {user.schoolName}
                                    </span>
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
                            <Button
                                type="button"
                                onClick={() => setShowDeleteDialog(true)}
                                aria-label={`ลบ ${displayName} ออกจากระบบ`}
                                variant="danger"
                                size="sm"
                                className="text-xs"
                                title="ลบผู้ใช้"
                            >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                                ลบ
                            </Button>
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
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="ลบผู้ใช้ออกจากระบบ"
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

export function UserTable({
    users,
    total,
    page,
    pageSize,
    onPageChange,
    onMutated,
    hasActiveFilters = false,
}: UserTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return (
        <SectionCard className="p-6 md:p-8">
            <SectionCardHeader
                icon={UserCircle}
                className="text-xl"
                title={`ผู้ใช้งาน (${total})`}
            />

            {users.length === 0 ? (
                <EmptyState
                    icon={hasActiveFilters ? Search : Users}
                    title={
                        hasActiveFilters
                            ? "ไม่พบผู้ใช้ตามเงื่อนไขนี้"
                            : "ยังไม่มีผู้ใช้งาน"
                    }
                    description={
                        hasActiveFilters
                            ? "ลองล้างคำค้นหา หรือเลือกทุกโรงเรียนเพื่อดูรายการทั้งหมด"
                            : "ผู้ใช้จะแสดงที่นี่หลังจากรับคำเชิญและสร้างบัญชี"
                    }
                    className="p-12"
                    variant="emerald"
                />
            ) : (
                <>
                    <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
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
                        <TableMetaRow
                            summary={
                                <>
                                    แสดง {start + 1}–
                                    {Math.min(start + pageSize, total)} จาก{" "}
                                    {total} รายการ
                                </>
                            }
                            controls={
                                <PaginationControls
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPrevious={() => onPageChange(page - 1)}
                                    onNext={() => onPageChange(page + 1)}
                                    className="flex items-center gap-2"
                                />
                            }
                        />
                    )}
                </>
            )}
        </SectionCard>
    );
}
