"use client";

import { useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { revokeSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import type {
    SchoolAdminInvite,
    InviteStatus,
    InviteRole,
} from "@/types/school-admin-invite.types";

interface InviteRowProps {
    invite: SchoolAdminInvite;
    onRevoked: () => void;
}

function getInviteStatus(invite: SchoolAdminInvite): InviteStatus {
    if (invite.usedAt !== null) return "used";
    if (new Date(invite.expiresAt) < new Date()) return "expired";
    return "pending";
}

function getInviteUrl(token: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/invite/admin/${token}`;
}

export function InviteRow({ invite, onRevoked }: InviteRowProps) {
    const [copied, setCopied] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState(false);

    const status = getInviteStatus(invite);

    async function handleCopy() {
        await navigator.clipboard.writeText(getInviteUrl(invite.token));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleRevoke() {
        if (!confirmRevoke) {
            setConfirmRevoke(true);
            return;
        }
        setIsRevoking(true);
        const result = await revokeSchoolAdminInvite(invite.id);
        if (result.success) {
            onRevoked();
        }
        setIsRevoking(false);
        setConfirmRevoke(false);
    }

    return (
        <tr className="hover:bg-emerald-50/30 transition-colors">
            <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                {invite.email}
            </td>
            <td className="px-6 py-4 text-center">
                <RoleBadge role={invite.role} />
            </td>
            <td className="px-6 py-4 text-center">
                <StatusBadge status={status} />
            </td>
            <td className="px-6 py-4 text-center text-sm text-gray-500 hidden sm:table-cell">
                {new Date(invite.createdAt).toLocaleDateString("th-TH")}
            </td>
            <td className="px-6 py-4 text-center text-sm text-gray-500 hidden md:table-cell">
                {new Date(invite.expiresAt).toLocaleDateString("th-TH")}
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                    {status === "pending" && (
                        <>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                title="คัดลอก Link"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                                {copied ? "คัดลอกแล้ว" : "Copy"}
                            </button>

                            <button
                                type="button"
                                onClick={handleRevoke}
                                disabled={isRevoking}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                    confirmRevoke
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-red-50 hover:bg-red-100 text-red-600"
                                }`}
                                title="ยกเลิกคำเชิญ"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {isRevoking
                                    ? "กำลังยกเลิก..."
                                    : confirmRevoke
                                      ? "ยืนยันยกเลิก"
                                      : "ยกเลิก"}
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

function RoleBadge({ role }: { role: InviteRole }) {
    if (role === "system_admin") {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                System Admin
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            School Admin
        </span>
    );
}

function StatusBadge({ status }: { status: InviteStatus }) {
    if (status === "pending") {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                รอดำเนินการ
            </span>
        );
    }
    if (status === "used") {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                ใช้งานแล้ว
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
            หมดอายุ
        </span>
    );
}
