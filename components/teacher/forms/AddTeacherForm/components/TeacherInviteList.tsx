"use client";

import { useState } from "react";
import {
    ClipboardList,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

function StatusBadge({ status }: { status: InviteStatus }) {
    if (status === "pending") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                <Clock className="w-3 h-3" />
                รอดำเนินการ
            </span>
        );
    }
    if (status === "accepted") {
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

function CopyButton({ token }: { token: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(getInviteUrl(token));
            setCopied(true);
            toast.success("คัดลอกลิงก์คำเชิญเรียบร้อย");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("ไม่สามารถคัดลอกลิงก์ได้ กรุณาคัดลอกด้วยตนเอง");
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="คัดลอก Link"
        >
            {copied ? (
                <Check className="w-3.5 h-3.5" />
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "คัดลอกแล้ว" : "Copy Link"}
        </button>
    );
}

function RevokeButton({
    inviteId,
    inviteName,
    onRevoked,
}: {
    inviteId: string;
    inviteName: string;
    onRevoked?: () => void;
}) {
    const [showDialog, setShowDialog] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    async function handleConfirmRevoke() {
        setIsRevoking(true);
        const result = await revokeTeacherInvite(inviteId);
        if (result.success) {
            toast.success(result.message);
            onRevoked?.();
        } else {
            toast.error(result.message);
        }
        setIsRevoking(false);
        setShowDialog(false);
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setShowDialog(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-red-50 hover:bg-red-100 text-red-600"
                title="ยกเลิกคำเชิญ"
            >
                <Trash2 className="w-3.5 h-3.5" />
                ยกเลิก
            </button>
            <ConfirmDialog
                isOpen={showDialog}
                title="ยกเลิกคำเชิญ"
                message={`ต้องการยกเลิกคำเชิญของ "${inviteName}" ใช่หรือไม่?`}
                confirmLabel="ยืนยันยกเลิก"
                isLoading={isRevoking}
                onConfirm={handleConfirmRevoke}
                onCancel={() => setShowDialog(false)}
            />
        </>
    );
}

function InviteCard({
    invite,
    onRevoked,
}: {
    invite: TeacherInviteWithAcademicYear;
    onRevoked?: () => void;
}) {
    const status = getInviteStatus(invite);

    return (
        <div className="p-4 bg-white rounded-xl border border-emerald-100 hover:border-emerald-200 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
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
                    <StatusBadge status={status} />
                    {status === "pending" && (
                        <div className="flex items-center gap-1.5">
                            <CopyButton token={invite.token} />
                            <RevokeButton
                                inviteId={invite.id}
                                inviteName={`${invite.firstName} ${invite.lastName}`}
                                onRevoked={onRevoked}
                            />
                        </div>
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
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0BD0D9] stroke-[2.5]" />
                <span className="text-gray-800">
                    รายการคำเชิญครู ({invites.length})
                </span>
            </h2>

            {invites.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-xl border-2 border-dashed border-emerald-200">
                    <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-bold">ยังไม่มีคำเชิญ</p>
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                        สร้างคำเชิญด้านบนเพื่อเชิญครูเข้าระบบ
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
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-100">
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
