"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Link2, MailCheck, ShieldCheck } from "lucide-react";
import { InviteCreateForm } from "@/components/admin/invite/InviteCreateForm";
import { InviteTable } from "@/components/admin/invite/InviteTable";
import { getInviteStatus } from "@/components/ui/invite-utils";
import type { SchoolAdminInvite } from "@/types/school-admin-invite.types";

interface InviteManagerProps {
    invites: SchoolAdminInvite[];
}

interface InviteStatusSummary {
    pending: number;
    used: number;
    expired: number;
}

export function InviteManager({ invites }: InviteManagerProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const summary = getInviteSummary(invites);

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
            <InviteOnboardingPanel summary={summary} />
            <InviteCreateForm onCreated={refresh} />
            <InviteTable invites={invites} onRevoked={handleRevoked} />
        </div>
    );
}

function getInviteSummary(invites: SchoolAdminInvite[]): InviteStatusSummary {
    return invites.reduce<InviteStatusSummary>(
        (summary, invite) => {
            const status = getInviteStatus({
                completedAt: invite.usedAt,
                expiresAt: invite.expiresAt,
                completedStatus: "used",
            });

            if (status === "used") {
                return { ...summary, used: summary.used + 1 };
            }
            if (status === "expired") {
                return { ...summary, expired: summary.expired + 1 };
            }
            return { ...summary, pending: summary.pending + 1 };
        },
        { pending: 0, used: 0, expired: 0 },
    );
}

function InviteOnboardingPanel({
    summary,
}: {
    summary: InviteStatusSummary;
}): ReactNode {
    return (
        <section className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-cyan-800">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        <h2 className="text-sm font-bold">
                            ส่งคำเชิญแอดมินให้ถูกบทบาท
                        </h2>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-cyan-950/75">
                        ใช้หน้านี้เมื่อต้องเพิ่มแอดมินระบบหรือแอดมินโรงเรียน
                        ลิงก์ใช้ตั้งรหัสผ่านและจะติดตามสถานะได้ด้านล่าง
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <InviteMetric label="รอตอบรับ" value={summary.pending} />
                    <InviteMetric label="ใช้แล้ว" value={summary.used} />
                    <InviteMetric label="หมดอายุ" value={summary.expired} />
                </div>
            </div>

            <ol className="mt-4 grid gap-2 md:grid-cols-4">
                <InviteStep
                    icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    title="เลือกบทบาท"
                    description="แอดมินระบบดูแลทั้งระบบ แอดมินโรงเรียนเริ่มตั้งค่าโรงเรียนของตัวเอง"
                />
                <InviteStep
                    icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
                    title="สร้างลิงก์"
                    description="กรอกอีเมลจริงของผู้รับ แล้วสร้างลิงก์สำหรับอีเมลนั้นเท่านั้น"
                />
                <InviteStep
                    icon={<MailCheck className="h-4 w-4" aria-hidden="true" />}
                    title="ส่งให้ผู้รับ"
                    description="คัดลอกลิงก์แล้วส่งผ่านช่องทางที่โรงเรียนใช้สื่อสาร"
                />
                <InviteStep
                    icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
                    title="ติดตามสถานะ"
                    description="ตรวจสถานะและยกเลิกลิงก์ที่ยังรอตอบรับได้จากรายการคำเชิญ"
                />
            </ol>
        </section>
    );
}

function InviteMetric({
    label,
    value,
}: {
    label: string;
    value: number;
}): ReactNode {
    return (
        <span className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-800">
            {label}: {value}
        </span>
    );
}

function InviteStep({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}): ReactNode {
    return (
        <li className="rounded-xl border border-cyan-100 bg-white p-3 text-cyan-900">
            <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                    {icon}
                </span>
                <span className="text-sm font-bold">{title}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-cyan-950/70">
                {description}
            </p>
        </li>
    );
}
