import type { StatusBadgeTone } from "@/components/ui/StatusBadge";

type CompletedInviteStatus = Extract<StatusBadgeTone, "accepted" | "used">;

interface InviteStatusInput {
    completedAt: Date | string | null;
    expiresAt: Date | string;
    completedStatus: CompletedInviteStatus;
}

export function getInviteStatus({
    completedAt,
    expiresAt,
    completedStatus,
}: InviteStatusInput): StatusBadgeTone {
    if (completedAt !== null) return completedStatus;
    if (new Date(expiresAt) < new Date()) return "expired";
    return "pending";
}

export function getInviteStatusLabel(status: StatusBadgeTone): string {
    switch (status) {
        case "pending":
            return "รอดำเนินการ";
        case "used":
        case "accepted":
            return "ใช้งานแล้ว";
        case "expired":
            return "หมดอายุ";
    }
}

export function buildInviteUrl(path: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}${path}`;
}

export function formatInviteDate(value: Date | string): string {
    return new Date(value).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
    });
}
