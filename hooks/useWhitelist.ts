"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
    whitelistEmailSchema,
    type WhitelistFormData,
} from "@/lib/validations/whitelist.validation";
import {
    addWhitelistEntry,
    removeWhitelistEntry,
    toggleWhitelistEntry,
} from "@/lib/actions/whitelist.actions";
import type { WhitelistEntry } from "@/types/whitelist.types";

interface UseWhitelistReturn {
    entries: WhitelistEntry[];
    isSubmitting: boolean;
    deletingId: string | null;
    togglingId: string | null;
    confirmDeleteId: string | null;
    currentUserEmail: string;
    form: ReturnType<typeof useForm<WhitelistFormData>>;
    onSubmit: (data: WhitelistFormData) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
    handleToggle: (id: string) => Promise<void>;
    setConfirmDeleteId: (id: string | null) => void;
}

export function useWhitelist(
    initialEntries: WhitelistEntry[],
    currentUserEmail: string,
): UseWhitelistReturn {
    const [entries, setEntries] = useState<WhitelistEntry[]>(initialEntries);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const form = useForm<WhitelistFormData>({
        resolver: zodResolver(whitelistEmailSchema),
    });

    const onSubmit = useCallback(
        async (data: WhitelistFormData): Promise<void> => {
            setIsSubmitting(true);
            try {
                const result = await addWhitelistEntry({ email: data.email });
                if (result.success && result.data) {
                    const newEntry = result.data;
                    setEntries((prev) => [newEntry, ...prev]);
                    toast.success(result.message);
                    form.reset();
                } else {
                    toast.error(result.message);
                }
            } catch {
                toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
            } finally {
                setIsSubmitting(false);
            }
        },
        [form],
    );

    const isSelf = useCallback(
        (id: string): boolean => {
            const entry = entries.find((e) => e.id === id);
            return entry?.email === currentUserEmail;
        },
        [entries, currentUserEmail],
    );

    const handleDelete = useCallback(async (id: string): Promise<void> => {
        if (isSelf(id)) {
            toast.error("ไม่สามารถลบอีเมลของตัวเองได้");
            return;
        }
        setDeletingId(id);
        try {
            const result = await removeWhitelistEntry(id);
            if (result.success) {
                setEntries((prev) => prev.filter((e) => e.id !== id));
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการลบ");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    }, [isSelf]);

    const handleToggle = useCallback(async (id: string): Promise<void> => {
        if (isSelf(id)) {
            toast.error("ไม่สามารถปิดใช้งานอีเมลของตัวเองได้");
            return;
        }
        setTogglingId(id);
        try {
            const result = await toggleWhitelistEntry(id);
            if (result.success && result.data) {
                const updatedEntry = result.data;
                setEntries((prev) =>
                    prev.map((e) =>
                        e.id === id
                            ? { ...e, isActive: updatedEntry.isActive }
                            : e,
                    ),
                );
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("เกิดข้อผิดพลาดในการแก้ไขสถานะ");
        } finally {
            setTogglingId(null);
        }
    }, [isSelf]);

    return {
        entries,
        isSubmitting,
        deletingId,
        togglingId,
        confirmDeleteId,
        currentUserEmail,
        form,
        onSubmit,
        handleDelete,
        handleToggle,
        setConfirmDeleteId,
    };
}
