"use client";

import { useMemo, useState } from "react";
import {
    ClipboardList,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteActionRow } from "@/components/ui/InviteActionRow";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SectionCard, SectionCardHeader } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableMetaRow } from "@/components/ui/TableMetaRow";
import {
    buildInviteUrl,
    formatInviteDate,
    getInviteStatus,
    getInviteStatusLabel,
} from "@/components/ui/invite-utils";
import type { TeacherInviteWithAcademicYear } from "@/lib/actions/teacher-invite";
import { revokeTeacherInvite } from "@/lib/actions/teacher-invite";
import { RoleBadge } from "@/components/ui/badges";

const PAGE_SIZE = 5;
const CLASS_TEACHER_LABEL = "ครูประจำชั้น";
const SCHOOL_ADMIN_LABEL = "ผู้ดูแลโรงเรียน";

interface TeacherInviteListProps {
    invites: TeacherInviteWithAcademicYear[];
    onRevoked?: () => void;
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
    const status = getInviteStatus({
        completedAt: invite.acceptedAt,
        expiresAt: invite.expiresAt,
        completedStatus: "accepted",
    });

    async function handleCopy(): Promise<void> {
        if (!invite.token) return;

        try {
            await navigator.clipboard.writeText(
                buildInviteUrl(`/invite/${invite.token}`),
            );
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                            copied={copied}
                            isRevoking={isRevoking}
                            onCopy={handleCopy}
                            onConfirmRevoke={handleConfirmRevoke}
                            revokeDialogTitle="ยกเลิกคำเชิญ"
                            revokeDialogMessage={`ต้องการยกเลิกคำเชิญของ "${invite.firstName} ${invite.lastName}" ใช่หรือไม่?`}
                            showCopyButton={invite.token.length > 0}
                        />
                    )}
                </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-emerald-50 pt-3 text-[11px] text-gray-400 sm:flex-row sm:items-center sm:gap-4">
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
            </div>
        </div>
    );
}

function normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase("th-TH");
}

function getInviteRoleSearchText(role: string): string {
    if (role === "class_teacher") return `${role} ${CLASS_TEACHER_LABEL}`;
    if (role === "school_admin") return `${role} ${SCHOOL_ADMIN_LABEL}`;
    return role;
}

function getTeacherInviteSearchText(
    invite: TeacherInviteWithAcademicYear,
): string {
    return [
        invite.firstName,
        invite.lastName,
        `${invite.firstName} ${invite.lastName}`,
        invite.email,
        getInviteRoleSearchText(invite.userRole),
        invite.advisoryClass ?? "",
    ]
        .join(" ")
        .toLocaleLowerCase("th-TH");
}

function getSearchResultSummary({
    isSearching,
    filteredCount,
    totalCount,
}: {
    isSearching: boolean;
    filteredCount: number;
    totalCount: number;
}): string {
    if (!isSearching) return `มีคำเชิญครูทั้งหมด ${totalCount} รายการ`;
    return `พบคำเชิญครู ${filteredCount} จากทั้งหมด ${totalCount} รายการ`;
}

export function TeacherInviteList({
    invites,
    onRevoked,
}: TeacherInviteListProps) {
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const normalizedQuery = normalizeSearch(searchQuery);
    const filteredInvites = useMemo(() => {
        if (!normalizedQuery) return invites;

        return invites.filter((invite) =>
            getTeacherInviteSearchText(invite).includes(normalizedQuery),
        );
    }, [invites, normalizedQuery]);
    const isSearching = normalizedQuery.length > 0;
    const totalPages = Math.max(1, Math.ceil(filteredInvites.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(page, totalPages);
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    const paginatedInvites = filteredInvites.slice(start, start + PAGE_SIZE);
    const resultSummary = getSearchResultSummary({
        isSearching,
        filteredCount: filteredInvites.length,
        totalCount: invites.length,
    });

    function handleSearchChange(value: string): void {
        setSearchQuery(value);
        setPage(1);
    }

    return (
        <SectionCard className="p-5 sm:p-6">
            <div className="space-y-4">
                <SectionCardHeader
                    icon={ClipboardList}
                    className="text-lg"
                    titleClassName="text-gray-800"
                    title={`รายการคำเชิญครู (${invites.length})`}
                />
                {invites.length > 0 && (
                    <ListSearchField
                        value={searchQuery}
                        onChange={handleSearchChange}
                        label="ค้นหารายการคำเชิญครู"
                        placeholder="ค้นหาชื่อ อีเมล บทบาท หรือห้องประจำชั้น"
                        resultSummary={resultSummary}
                        borderClassName="border-emerald-100"
                    />
                )}
            </div>

            {invites.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    variant="emerald"
                    title="ยังไม่มีคำเชิญ"
                    description="สร้างคำเชิญด้านบนเพื่อเชิญครูเข้าระบบ"
                    className="p-8"
                />
            ) : filteredInvites.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    variant="emerald"
                    title="ไม่พบคำเชิญที่ตรงกับคำค้น"
                    description="ลองค้นหาด้วยชื่อ อีเมล บทบาท หรือห้องประจำชั้นอื่น"
                    className="mt-4 p-8"
                />
            ) : (
                <>
                    <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-0 sm:max-h-[400px] sm:pr-1">
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
                            borderClassName="border-emerald-100"
                            controlsClassName="justify-between sm:justify-end"
                            summary={
                                <>
                                    แสดง {start + 1}–
                                    {Math.min(
                                        start + PAGE_SIZE,
                                        filteredInvites.length,
                                    )}{" "}
                                    จาก {filteredInvites.length} รายการ
                                    {isSearching && ` จากทั้งหมด ${invites.length}`}
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
