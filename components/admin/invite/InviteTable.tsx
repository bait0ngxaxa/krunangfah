"use client";

import { useState } from "react";
import {
    AlertCircle,
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
import {
    formatInviteDate,
    getInviteStatus,
    getInviteStatusLabel,
} from "@/components/ui/invite-utils";
import { revokeSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import type { SchoolAdminInvite } from "@/types/school-admin-invite.types";

const PAGE_SIZE = 10;

interface InviteTableProps {
    invites: SchoolAdminInvite[];
    onRevoked: () => void;
}

function InviteCard({
    invite,
    onRevoked,
}: {
    invite: SchoolAdminInvite;
    onRevoked: () => void;
}) {
    const [isRevoking, setIsRevoking] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const status = getInviteStatus({
        completedAt: invite.usedAt,
        expiresAt: invite.expiresAt,
        completedStatus: "used",
    });

    async function handleConfirmRevoke(): Promise<boolean> {
        if (isRevoking) return false;

        setActionError(null);
        setIsRevoking(true);
        try {
            const result = await revokeSchoolAdminInvite(invite.id);
            if (result.success) {
                toast.success(`ยกเลิกคำเชิญสำหรับ "${invite.email}" สำเร็จ`);
                onRevoked();
                return true;
            }
            const message = result.message || "เกิดข้อผิดพลาดในการยกเลิกคำเชิญ";
            setActionError(message);
            toast.error(message);
            return false;
        } catch {
            const message = "ยกเลิกคำเชิญไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
            setActionError(message);
            toast.error(message);
            return false;
        } finally {
            setIsRevoking(false);
        }
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <Mail
                            className="w-4 h-4 text-gray-600"
                            aria-hidden="true"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p
                            className="break-all text-sm font-bold leading-5 text-gray-800"
                            title={invite.email}
                            dir="auto"
                        >
                            {invite.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <RoleBadge role={invite.role} />
                        </div>
                    </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-end">
                    <StatusBadge
                        tone={status}
                        label={getInviteStatusLabel(status)}
                    />
                    {status === "pending" && (
                        <InviteActionRow
                            isRevoking={isRevoking}
                            onConfirmRevoke={handleConfirmRevoke}
                            revokeDialogTitle="ยกเลิกคำเชิญ"
                            revokeDialogMessage={`ต้องการยกเลิกคำเชิญของ "${invite.email}" ใช่หรือไม่?`}
                            showCopyButton={false}
                        />
                    )}
                </div>
            </div>
            {actionError && (
                <p
                    className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-red-600"
                    role="status"
                    aria-live="polite"
                >
                    <AlertCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                    />
                    <span>{actionError}</span>
                </p>
            )}
            <div className="mt-3 flex flex-col gap-1.5 border-t border-gray-50 pt-3 text-[11px] leading-5 text-gray-600 sm:flex-row sm:items-center sm:gap-4">
                <span>
                    สร้างเมื่อ{" "}
                    {formatInviteDate(invite.createdAt)}
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
                        {formatInviteDate(invite.expiresAt)}
                    </span>
                </span>
                {invite.creator?.name && (
                    <span className="break-words" title={invite.creator.name}>
                        โดย {invite.creator.name}
                    </span>
                )}
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
                    description="เริ่มจากกรอกอีเมล เลือกบทบาท แล้วสร้างลิงก์คำเชิญด้านบน"
                    className="p-12"
                    variant="emerald"
                />
            ) : (
                <>
                    <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-0 sm:max-h-[400px] sm:pr-1">
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
                            className="flex-col items-stretch gap-3 sm:flex-row sm:items-center"
                            controlsClassName="justify-between sm:justify-end"
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
