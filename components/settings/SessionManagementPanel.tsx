"use client";

import { useState, useTransition } from "react";
import { Monitor, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
    listMySessions,
    revokeOtherSessions,
    revokeSessionById,
} from "@/lib/actions/session-management.actions";
import { buttonVariants } from "@/components/ui/Button";
import type { ManagedSession } from "@/types/profile.types";

interface SessionManagementPanelProps {
    initialSessions: ManagedSession[];
}

function formatDate(value: Date): string {
    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getDeviceIcon(label: string): typeof Smartphone | typeof Monitor {
    return label.includes("มือถือ") || label.includes("แท็บเล็ต")
        ? Smartphone
        : Monitor;
}

export function SessionManagementPanel({
    initialSessions,
}: SessionManagementPanelProps) {
    const [sessions, setSessions] = useState(initialSessions);
    const [isPending, startTransition] = useTransition();

    function refreshSessions(): void {
        startTransition(async () => {
            const result = await listMySessions();
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            setSessions(result.sessions);
        });
    }

    function revokeSession(sessionId: string): void {
        startTransition(async () => {
            const result = await revokeSessionById(sessionId);
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            setSessions(result.sessions);
            toast.success(result.message);
        });
    }

    function revokeOthers(): void {
        startTransition(async () => {
            const result = await revokeOtherSessions();
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            setSessions(result.sessions);
            toast.success(result.message);
        });
    }

    const otherSessionCount = sessions.filter((session) => !session.isCurrent)
        .length;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        อุปกรณ์ที่เข้าสู่ระบบอยู่
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        ตรวจสอบและออกจากระบบอุปกรณ์ที่ไม่ได้ใช้งาน
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={refreshSessions}
                        disabled={isPending}
                        className={buttonVariants({
                            variant: "secondary",
                            className: "px-4 py-2 text-sm",
                        })}
                    >
                        รีเฟรช
                    </button>
                    <button
                        type="button"
                        onClick={revokeOthers}
                        disabled={isPending || otherSessionCount === 0}
                        className={buttonVariants({
                            variant: "danger",
                            className: "px-4 py-2 text-sm",
                        })}
                    >
                        ออกจากระบบอุปกรณ์อื่น
                    </button>
                </div>
            </div>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {sessions.map((session) => {
                    const DeviceIcon = getDeviceIcon(session.userAgentLabel);
                    return (
                        <div
                            key={session.id}
                            className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex gap-3">
                                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <DeviceIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-gray-900">
                                            {session.userAgentLabel}
                                        </p>
                                        {session.isCurrent && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                <ShieldCheck className="h-3 w-3" />
                                                เครื่องนี้
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600">
                                        ใช้งานล่าสุด{" "}
                                        {formatDate(session.lastActivityAt)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        หมดอายุ {formatDate(session.expiresAt)}
                                        {session.lastIpPrefix
                                            ? ` · เครือข่าย ${session.lastIpPrefix}`
                                            : ""}
                                    </p>
                                </div>
                            </div>

                            {!session.isCurrent && (
                                <button
                                    type="button"
                                    onClick={() => revokeSession(session.id)}
                                    disabled={isPending}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-4 w-4" />
                                    ออกจากระบบ
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
