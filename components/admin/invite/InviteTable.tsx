"use client";

import { useState } from "react";
import {
    ClipboardList,
    Mail,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteActionRow } from "@/components/ui/InviteActionRow";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SectionCard, SectionCardHeader } from "@/components/ui/SectionCard";
import { RoleBadge } from "@/components/ui/badges";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableMetaRow } from "@/components/ui/TableMetaRow";
import { revokeSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import type {
    SchoolAdminInvite,
    InviteStatus,
} from "@/types/school-admin-invite.types";

const PAGE_SIZE = 10;

interface InviteTableProps {
    invites: SchoolAdminInvite[];
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

function InviteCard({
    invite,
    onRevoked,
}: {
    invite: SchoolAdminInvite;
    onRevoked: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    const status = getInviteStatus(invite);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(getInviteUrl(invite.token));
            setCopied(true);
            toast.success("คัดลอกลิงก์คำเชิญเรียบร้อย");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("ไม่สามารถคัดลอกลิงก์ได้ กรุณาคัดลอกด้วยตนเอง");
        }
    }

    async function handleConfirmRevoke() {
        setIsRevoking(true);
        const result = await revokeSchoolAdminInvite(invite.id);
        if (result.success) {
            toast.success(`ยกเลิกคำเชิญสำหรับ "${invite.email}" สำเร็จ`);
            onRevoked();
        } else {
            toast.error("เกิดข้อผิดพลาดในการยกเลิกคำเชิญ");
        }
        setIsRevoking(false);
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-800 truncate">
                            {invite.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <RoleBadge role={invite.role} />
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                    <StatusBadge
                        tone={status}
                        label={
                            status === "pending"
                                ? "รอดำเนินการ"
                                : status === "used"
                                  ? "ใช้งานแล้ว"
                                  : "หมดอายุ"
                        }
                    />
                    {status === "pending" && (
                        <InviteActionRow
                            copied={copied}
                            isRevoking={isRevoking}
                            onCopy={handleCopy}
                            onConfirmRevoke={handleConfirmRevoke}
                            revokeDialogTitle="ยกเลิกคำเชิญ"
                            revokeDialogMessage={`ต้องการยกเลิกคำเชิญของ "${invite.email}" ใช่หรือไม่?`}
                        />
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
                <span>
                    สร้างเมื่อ{" "}
                    {new Date(invite.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                    })}
                </span>
                <span>
                    หมดอายุ{" "}
                    <span
                        className={
                            status === "expired"
                                ? "text-red-500 font-semibold"
                                : ""
                        }
                    >
                        {new Date(invite.expiresAt).toLocaleDateString(
                            "th-TH",
                            {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                            },
                        )}
                    </span>
                </span>
                {invite.creator?.name && <span>โดย {invite.creator.name}</span>}
            </div>
        </div>
    );
}

export function InviteTable({ invites, onRevoked }: InviteTableProps) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(invites.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(page, totalPages);
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    const paginatedInvites = invites.slice(start, start + PAGE_SIZE);

    return (
        <SectionCard className="p-6 md:p-8">
            <SectionCardHeader
                icon={ClipboardList}
                className="text-xl"
                title={`รายการคำเชิญ (${invites.length})`}
            />

            {invites.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    title="ยังไม่มีคำเชิญ"
                    description="สร้างคำเชิญด้านบนเพื่อเชิญแอดมิน"
                    className="p-12"
                />
            ) : (
                <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {paginatedInvites.map((invite) => (
                            <InviteCard
                                key={invite.id}
                                invite={invite}
                                onRevoked={onRevoked}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <TableMetaRow
                            summary={
                                <>
                                    แสดง {start + 1}–
                                    {Math.min(start + PAGE_SIZE, invites.length)}{" "}
                                    จาก {invites.length} รายการ
                                </>
                            }
                            controls={
                                <PaginationControls
                                    currentPage={safeCurrentPage}
                                    totalPages={totalPages}
                                    onPrevious={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    onNext={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    className="flex items-center gap-2"
                                />
                            }
                        />
                    )}
                </>
            )}
        </SectionCard>
    );
}
