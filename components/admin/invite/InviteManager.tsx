"use client";

import { useState, useEffect, useTransition } from "react";
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

    // Sync localInvites whenever the server sends fresh props after router.refresh()
    useEffect(() => {
        setLocalInvites(invites);
    }, [invites]);

    function refresh() {
        startTransition(() => {
            router.refresh();
        });
    }

    function handleRevoked() {
        refresh();
    }

    return (
        <div className="space-y-6">
            <InviteCreateForm onCreated={refresh} />
            <InviteTable invites={localInvites} onRevoked={handleRevoked} />
        </div>
    );
}
