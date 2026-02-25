"use client";

import { useState } from "react";
import {
    ClipboardList,
    Copy,
    Check,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Mail,
} from "lucide-react";
import { toast } from "sonner";
import { revokeSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import type {
    SchoolAdminInvite,
    InviteStatus,
    InviteRole,
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

function StatusBadge({ status }: { status: InviteStatus }) {
    if (status === "pending") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                <Clock className="w-3 h-3" />
                รอดำเนินการ
            </span>
        );
    }
    if (status === "used") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                <CheckCircle2 className="w-3 h-3" />
                ใช้งานแล้ว
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
            <AlertCircle className="w-3 h-3" />
            หมดอายุ
        </span>
    );
}

function RoleBadge({ role }: { role: InviteRole }) {
    if (role === "system_admin") {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                System Admin
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            School Admin
        </span>
    );
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
    const [confirmRevoke, setConfirmRevoke] = useState(false);

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

    async function handleRevoke() {
        if (!confirmRevoke) {
            setConfirmRevoke(true);
            // Auto-dismiss confirm state after 3 seconds
            setTimeout(() => setConfirmRevoke(false), 3000);
            return;
        }
        setIsRevoking(true);
        const result = await revokeSchoolAdminInvite(invite.id);
        if (result.success) {
            toast.success(`ยกเลิกคำเชิญสำหรับ "${invite.email}" สำเร็จ`);
            onRevoked();
        } else {
            toast.error("เกิดข้อผิดพลาดในการยกเลิกคำเชิญ");
        }
        setIsRevoking(false);
        setConfirmRevoke(false);
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
                    <StatusBadge status={status} />
                    {status === "pending" && (
                        <div className="flex items-center gap-1.5">
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
                                {copied ? "คัดลอกแล้ว" : "Copy Link"}
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
                                      ? "ยืนยันยกเลิก?"
                                      : "ยกเลิก"}
                            </button>
                        </div>
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
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-gray-100 shadow-sm relative overflow-hidden">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0BD0D9] stroke-[2.5]" />
                <span className="text-gray-900 font-extrabold">
                    รายการคำเชิญ ({invites.length})
                </span>
            </h2>

            {invites.length === 0 ? (
                <div className="p-12 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                    <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-bold text-lg">
                        ยังไม่มีคำเชิญ
                    </p>
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                        สร้างคำเชิญด้านบนเพื่อเชิญแอดมิน
                    </p>
                </div>
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
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                                แสดง {start + 1}–
                                {Math.min(start + PAGE_SIZE, invites.length)}{" "}
                                จาก {invites.length} รายการ
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={safeCurrentPage <= 1}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    ก่อนหน้า
                                </button>
                                <span className="text-xs font-bold text-gray-700 px-1.5">
                                    {safeCurrentPage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={safeCurrentPage >= totalPages}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ถัดไป
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
