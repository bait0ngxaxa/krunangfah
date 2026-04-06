"use client";

import { useState } from "react";
import {
    ClipboardList,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteActionRow } from "@/components/ui/InviteActionRow";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SectionCard, SectionCardHeader } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableMetaRow } from "@/components/ui/TableMetaRow";
import type { TeacherInviteWithAcademicYear } from "@/lib/actions/teacher-invite";
import { revokeTeacherInvite } from "@/lib/actions/teacher-invite";
import { RoleBadge } from "@/components/ui/badges";

const PAGE_SIZE = 5;

type InviteStatus = "pending" | "accepted" | "expired";

interface TeacherInviteListProps {
    invites: TeacherInviteWithAcademicYear[];
    onRevoked?: () => void;
}

function getInviteStatus(invite: TeacherInviteWithAcademicYear): InviteStatus {
    if (invite.acceptedAt !== null) return "accepted";
    if (new Date(invite.expiresAt) < new Date()) return "expired";
    return "pending";
}

function getInviteUrl(token: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/invite/${token}`;
}

function InviteCard({
    invite,
    onRevoked,
}: {
    invite: TeacherInviteWithAcademicYear;
    onRevoked?: () => void;
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
        const result = await revokeTeacherInvite(invite.id);
        if (result.success) {
            toast.success(result.message);
            onRevoked?.();
        } else {
            toast.error(result.message);
        }
        setIsRevoking(false);
    }

    return (
        <div className="p-4 bg-white rounded-xl border border-gray-100 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-white border border-emerald-200 shadow-sm flex items-center justify-center">
                        <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-800 truncate">
                            {invite.firstName} {invite.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {invite.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <RoleBadge role={invite.userRole} />
                            {invite.userRole === "class_teacher" &&
                                invite.advisoryClass && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                        {invite.advisoryClass}
                                    </span>
                                )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-100">
                                {invite.academicYear.year}/
                                {invite.academicYear.semester}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                    <StatusBadge
                        tone={status}
                        label={
                            status === "pending"
                                ? "รอดำเนินการ"
                                : status === "accepted"
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
                            revokeDialogMessage={`ต้องการยกเลิกคำเชิญของ "${invite.firstName} ${invite.lastName}" ใช่หรือไม่?`}
                        />
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-50 text-[11px] text-gray-400">
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
            </div>
        </div>
    );
}

export function TeacherInviteList({
    invites,
    onRevoked,
}: TeacherInviteListProps) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(invites.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(page, totalPages);
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    const paginatedInvites = invites.slice(start, start + PAGE_SIZE);

    return (
        <SectionCard className="p-5 sm:p-6">
            <SectionCardHeader
                icon={ClipboardList}
                className="text-lg"
                titleClassName="text-gray-800"
                title={`รายการคำเชิญครู (${invites.length})`}
            />

            {invites.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    variant="emerald"
                    title="ยังไม่มีคำเชิญ"
                    description="สร้างคำเชิญด้านบนเพื่อเชิญครูเข้าระบบ"
                    className="p-8"
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
                            borderClassName="border-emerald-100"
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
