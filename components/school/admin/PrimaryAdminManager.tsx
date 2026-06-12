"use client";

import { usePrimaryAdmin } from "./usePrimaryAdmin";
import { AdminListItem } from "./components";
import type { PrimaryAdminManagerProps } from "./types";

export function PrimaryAdminManager({
    initialAdmins,
    currentUserId,
}: PrimaryAdminManagerProps) {
    const { admins, loadingId, confirmId, handleToggle, cancelConfirm } =
        usePrimaryAdmin({ initialAdmins });

    if (admins.length <= 1) {
        return (
            <p className="py-4 text-center text-sm text-gray-600">
                ยังไม่มีผู้ดูแลคนอื่นในโรงเรียน
            </p>
        );
    }

    return (
        <div className="space-y-2" aria-live="polite">
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

            <p className="pt-1 text-xs leading-5 text-gray-600">
                ผู้ดูแลที่มีสิทธิ์แอดมินสามารถจัดการห้องเรียน
                และจัดการรายชื่อครูได้
            </p>
        </div>
    );
}
