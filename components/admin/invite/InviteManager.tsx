"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InviteCreateForm } from "@/components/admin/invite/InviteCreateForm";
import { InviteTable } from "@/components/admin/invite/InviteTable";
import type { SchoolAdminInvite } from "@/types/school-admin-invite.types";

interface InviteManagerProps {
    invites: SchoolAdminInvite[];
}

export function InviteManager({ invites }: InviteManagerProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [localInvites, setLocalInvites] = useState(invites);

    function refresh() {
        startTransition(() => {
            router.refresh();
        });
    }

    function handleRevoked() {
        // Optimistically remove from local state; server revalidation will sync
        setLocalInvites(localInvites);
        refresh();
    }

    return (
        <div className="space-y-6">
            <InviteCreateForm onCreated={refresh} />
            <InviteTable invites={localInvites} onRevoked={handleRevoked} />
        </div>
    );
}
