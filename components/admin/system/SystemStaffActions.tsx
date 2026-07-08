"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TeacherAdvisoryClassForm } from "@/components/teacher/forms/TeacherAdvisoryClassForm";
import {
    changeUserRole,
    deleteUser,
} from "@/lib/actions/user-management.actions";
import { ADMIN_ADVISORY_CLASS } from "@/lib/constants/advisory-class";
import type {
    StaffRoleSelection,
    UserListItem,
} from "@/types/user-management.types";
import type {
    StaffEntityResult,
    SystemEntityResult,
    SystemSearchResult,
} from "@/lib/actions/system-admin/types";

interface RoleSelection {
    userId: string;
    role: StaffRoleSelection;
}

const STAFF_ROLE_OPTIONS: Array<{
    value: StaffRoleSelection;
    label: string;
}> = [
    { value: "primary_school_admin", label: "ผู้ดูแลโรงเรียน" },
    { value: "angel_teacher", label: "ครูนางฟ้า" },
    { value: "class_teacher", label: "ครูประจำชั้น" },
];

interface SystemStaffActionsProps {
    entity: StaffEntityResult;
    onEntityUpdated: (entity: SystemEntityResult) => void;
    onEntityRemoved: () => void;
    onRefreshSearch: () => Promise<SystemSearchResult>;
}

export function SystemStaffActions({
    entity,
    onEntityUpdated,
    onEntityRemoved,
    onRefreshSearch,
}: SystemStaffActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isPending, startTransition] = useTransition();
    const userId = getUserId(entity);
    const currentRole = getCurrentRole(entity);
    const currentStaffRole = getCurrentStaffRole(entity);
    const [roleSelection, setRoleSelection] = useState<RoleSelection>({
        userId,
        role: currentStaffRole,
    });
    const selectedRole =
        roleSelection.userId === userId
            ? roleSelection.role
            : currentStaffRole;
    const isSystemAdmin = currentRole === "system_admin";
    const canChangeRole = !isSystemAdmin && !entity.deletedAt;
    const canEditTeacher = hasTeacherProfile(entity) && !entity.deletedAt;
    const advisoryClass = getAdvisoryClass(entity);
    const needsClassBeforeRoleChange =
        selectedRole === "class_teacher" && advisoryClass === ADMIN_ADVISORY_CLASS;

    const handleRoleChange = () => {
        if (
            !canChangeRole ||
            selectedRole === currentStaffRole ||
            needsClassBeforeRoleChange
        ) {
            return;
        }
        startTransition(async () => {
            const result = await changeUserRole(userId, selectedRole);
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            toast.success(result.message);
            const nextResults = await onRefreshSearch();
            const refreshed = findEntity(nextResults, entity);
            if (refreshed) onEntityUpdated(refreshed);
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteUser(userId);
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            toast.success(result.message);
            setShowDeleteDialog(false);
            onEntityRemoved();
        });
    };

    return (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                    <UserCog className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-gray-950">
                        จัดการบัญชีบุคลากร
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-700">
                        แก้บทบาทบัญชีและการเข้าถึงของบุคลากรจากผลค้นหาเดียว
                    </p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                    <span className="text-xs font-medium text-gray-700">
                        บทบาทบัญชี
                    </span>
                    <select
                        value={selectedRole}
                        onChange={(event) =>
                            setRoleSelection({
                                userId,
                                role: event.target.value as StaffRoleSelection,
                            })
                        }
                        disabled={!canChangeRole || isPending}
                        className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none transition-base focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                    >
                        {STAFF_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="flex items-end">
                    <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        disabled={
                            !canChangeRole ||
                            isPending ||
                            selectedRole === currentStaffRole ||
                            needsClassBeforeRoleChange
                        }
                        onClick={handleRoleChange}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <ShieldCheck className="h-4 w-4" />
                        เปลี่ยนบทบาท
                    </Button>
                </div>
            </div>

            {canEditTeacher && selectedRole !== "class_teacher" ? (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs leading-5 text-emerald-800">
                    {selectedRole === "primary_school_admin"
                        ? "ผู้ดูแลโรงเรียนเป็นบัญชีหลักของโรงเรียน มีสิทธิ์ดูแลทุกห้องและไม่ต้องเลือกห้องที่ปรึกษา"
                        : "ครูนางฟ้ามีสิทธิ์ดูแลนักเรียนทุกห้อง แต่ไม่ใช่ผู้ดูแลโรงเรียนหลัก จึงไม่จัดการห้องเรียนและบัญชีครู"}
                </div>
            ) : null}

            {canEditTeacher && selectedRole === "class_teacher" ? (
                <TeacherAdvisoryClassForm
                    teacherId={userId}
                    initialAdvisoryClass={
                        advisoryClass === ADMIN_ADVISORY_CLASS ? null : advisoryClass
                    }
                    schoolId={entity.schoolId}
                    allClassesLabel="ทุกห้อง (ผู้ดูแล)"
                    includeAllClassesOption={false}
                    className="mt-4"
                    onSaved={async () => {
                        const nextResults = await onRefreshSearch();
                        const refreshed = findEntity(nextResults, entity);
                        if (refreshed) onEntityUpdated(refreshed);
                    }}
                    onCancel={() => undefined}
                />
            ) : null}

            {needsClassBeforeRoleChange ? (
                <p className="mt-2 text-xs leading-5 text-gray-600">
                    เลือกห้องที่ปรึกษาแล้วบันทึกด้านล่างเพื่อเปลี่ยนเป็นครูประจำชั้น
                </p>
            ) : null}

            {!isSystemAdmin ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-white p-3">
                    <p className="text-xs leading-5 text-red-700">
                        ลบบัญชีจะปิดการเข้าใช้งาน แต่ยังเก็บข้อมูลประวัติไว้
                    </p>
                    <Button
                        type="button"
                        className="mt-3"
                        variant="danger"
                        disabled={isPending || Boolean(entity.deletedAt)}
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                        ลบบัญชี
                    </Button>
                </div>
            ) : null}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="ลบบัญชีบุคลากร"
                message={`ต้องการลบ "${getDisplayName(entity)}" ออกจากระบบใช่หรือไม่? บัญชีนี้จะเข้าสู่ระบบไม่ได้อีก`}
                confirmLabel="ยืนยันลบ"
                isLoading={isPending}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </section>
    );
}

function getUserId(entity: StaffEntityResult): string {
    return entity.id;
}

function getCurrentRole(entity: StaffEntityResult): UserListItem["role"] {
    return entity.role;
}

function getCurrentStaffRole(entity: StaffEntityResult): StaffRoleSelection {
    const role = getCurrentRole(entity);
    if (role === "school_admin" && entity.isPrimary) return "primary_school_admin";
    if (role === "school_admin") return "angel_teacher";
    return "class_teacher";
}

function hasTeacherProfile(entity: StaffEntityResult): boolean {
    return entity.hasTeacherProfile;
}

function getAdvisoryClass(entity: StaffEntityResult): string | null {
    return entity.advisoryClass;
}

function getDisplayName(entity: StaffEntityResult): string {
    return entity.teacherName ?? entity.name ?? entity.email;
}

function findEntity(
    results: SystemSearchResult,
    entity: StaffEntityResult,
): SystemEntityResult | null {
    return results.staffs.find((item) => item.id === entity.id) ?? null;
}
