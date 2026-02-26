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
            <p className="text-sm text-gray-400 text-center py-4">
                ยังไม่มีผู้ดูแลคนอื่นในโรงเรียน
            </p>
        );
    }

    return (
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

            <p className="text-xs text-gray-400 pt-1">
                ผู้ดูแลที่มีสิทธิ์ Primary สามารถจัดการห้องเรียน เชิญครู
                และจัดการรายชื่อครูได้
            </p>
        </div>
    );
}
