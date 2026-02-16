"use client";

import { useWhitelist } from "@/hooks/useWhitelist";
import { WhitelistAddForm } from "@/components/admin/WhitelistAddForm";
import { WhitelistTable } from "@/components/admin/WhitelistTable";
import type { WhitelistEntry } from "@/types/whitelist.types";

interface WhitelistManagerProps {
    initialEntries: WhitelistEntry[];
    currentUserEmail: string;
}

export function WhitelistManager({ initialEntries, currentUserEmail }: WhitelistManagerProps) {
    const {
        entries,
        isSubmitting,
        deletingId,
        togglingId,
        confirmDeleteId,
        currentUserEmail: userEmail,
        form,
        onSubmit,
        handleDelete,
        handleToggle,
        setConfirmDeleteId,
    } = useWhitelist(initialEntries, currentUserEmail);

    return (
        <div className="space-y-6">
            <WhitelistAddForm
                form={form}
                isSubmitting={isSubmitting}
                onSubmit={onSubmit}
            />

            <WhitelistTable
                entries={entries}
                deletingId={deletingId}
                togglingId={togglingId}
                confirmDeleteId={confirmDeleteId}
                currentUserEmail={userEmail}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onConfirmDelete={setConfirmDeleteId}
            />
        </div>
    );
}
