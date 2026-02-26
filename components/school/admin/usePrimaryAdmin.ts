"use client";

import { useState } from "react";
import { toast } from "sonner";
import { togglePrimaryStatus } from "@/lib/actions/primary-admin.actions";
import type { SchoolAdminItem } from "@/types/primary-admin.types";
import type { UsePrimaryAdminReturn } from "./types";

interface UsePrimaryAdminParams {
    initialAdmins: SchoolAdminItem[];
}

export function usePrimaryAdmin({
    initialAdmins,
}: UsePrimaryAdminParams): UsePrimaryAdminReturn {
    const [admins, setAdmins] = useState<SchoolAdminItem[]>(initialAdmins);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    async function handleToggle(targetId: string): Promise<void> {
        const target = admins.find((a) => a.id === targetId);
        if (!target) return;

        // ถ้าเป็นการถอดสิทธิ์ → ต้อง confirm ก่อน
        if (target.isPrimary && confirmId !== targetId) {
            setConfirmId(targetId);
            return;
        }

        setConfirmId(null);
        setLoadingId(targetId);

        try {
            const result = await togglePrimaryStatus(targetId);

            if (!result.success) {
                toast.error(result.message);
                return;
            }

            // Update local state
            setAdmins((prev) =>
                prev.map((admin) =>
                    admin.id === targetId
                        ? { ...admin, isPrimary: !admin.isPrimary }
                        : admin,
                ),
            );

            toast.success(result.message);
        } catch {
            toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoadingId(null);
        }
    }

    function cancelConfirm(): void {
        setConfirmId(null);
    }

    return {
        admins,
        loadingId,
        confirmId,
        handleToggle,
        cancelConfirm,
    };
}
