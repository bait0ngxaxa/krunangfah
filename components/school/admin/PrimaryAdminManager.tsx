"use client";

import type { ReactNode } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { usePrimaryAdmin } from "./usePrimaryAdmin";
import { AdminListItem } from "./components";
import type { PrimaryAdminManagerProps } from "./types";

export function PrimaryAdminManager({
    initialAdmins,
    currentUserId,
    registeredTeacherCount = 0,
}: PrimaryAdminManagerProps) {
    const { admins, loadingId, confirmId, handleToggle, cancelConfirm } =
        usePrimaryAdmin({ initialAdmins });

    if (admins.length <= 1) {
        return (
            <div className="space-y-4">
                <PermissionOnboardingPanel />
                <PermissionEmptyState
                    registeredTeacherCount={registeredTeacherCount}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4" aria-live="polite">
            <PermissionOnboardingPanel />

            <div className="space-y-2">
                {admins.map((admin) => (
                    <AdminListItem
                        key={admin.id}
                        admin={admin}
                        isCurrentUser={admin.id === currentUserId}
                        isLoading={loadingId === admin.id}
                        isConfirming={confirmId === admin.id}
                        onToggle={handleToggle}
                        onCancelConfirm={cancelConfirm}
                    />
                ))}
            </div>

            <p className="pt-1 text-xs leading-5 text-gray-600">
                ผู้ดูแลที่มีสิทธิ์แอดมินสามารถจัดการห้องเรียน
                และจัดการรายชื่อครูได้
            </p>
        </div>
    );
}

function PermissionOnboardingPanel(): ReactNode {
    return (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="flex items-start gap-2 text-amber-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                    <h3 className="text-sm font-bold">
                        ตั้งสิทธิ์ผู้ดูแลให้พร้อม
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-amber-900/75">
                        เลือกครูในระบบที่ให้ช่วยจัดการข้อมูลโรงเรียน
                        ถอดสิทธิ์ได้เมื่อไม่ต้องการให้ดูแลส่วนนี้แล้ว
                    </p>
                </div>
            </div>
        </section>
    );
}

function PermissionEmptyState({
    registeredTeacherCount,
}: {
    registeredTeacherCount: number;
}): ReactNode {
    const message =
        registeredTeacherCount > 1
            ? "ครูคนอื่นยังไม่ได้รับสิทธิ์แอดมิน เลือกจากรายการเมื่อมีรายชื่อแสดงในส่วนนี้"
            : "เชิญครูให้ลงทะเบียนก่อน แล้วกลับมาเพิ่มสิทธิ์แอดมินให้ผู้ดูแลคนอื่น";

    return (
        <div className="rounded-xl border border-dashed border-amber-200 bg-white px-4 py-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-gray-800">
                ยังไม่มีผู้ดูแลคนอื่นในโรงเรียน
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-gray-600">
                {message}
            </p>
        </div>
    );
}
