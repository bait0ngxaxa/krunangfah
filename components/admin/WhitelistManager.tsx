"use client";

import { useWhitelist } from "@/hooks/useWhitelist";
import { WhitelistAddForm } from "@/components/admin/WhitelistAddForm";
import { WhitelistTable } from "@/components/admin/WhitelistTable";
import type { WhitelistEntry } from "@/types/whitelist.types";

interface WhitelistManagerProps {
    initialEntries: WhitelistEntry[];
}

export function WhitelistManager({ initialEntries }: WhitelistManagerProps) {
    const {
        entries,
        isSubmitting,
        deletingId,
        togglingId,
        confirmDeleteId,
        form,
        onSubmit,
        handleDelete,
        handleToggle,
        setConfirmDeleteId,
    } = useWhitelist(initialEntries);

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
                onToggle={handleToggle}
                onDelete={handleDelete}
                onConfirmDelete={setConfirmDeleteId}
            />
        </div>
    );
}
