import {
    Shield,
    ShieldCheck,
    GraduationCap,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { USER_ROLE_LABELS } from "@/lib/constants/roles";

/* ─── helpers ─── */

function getRoleLabel(role: string): string {
    if (role === "system_admin") return USER_ROLE_LABELS.system_admin;
    if (role === "school_admin") return USER_ROLE_LABELS.school_admin;
    if (role === "class_teacher") return USER_ROLE_LABELS.class_teacher;
    return role;
}

/* ─── RoleBadge ─── */

interface RoleBadgeProps {
    role: string;
    isPrimary?: boolean;
}

export function RoleBadge({ role, isPrimary = false }: RoleBadgeProps) {
    const label = getRoleLabel(role);

    if (role === "system_admin") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                <Shield className="w-3 h-3" />
                {label}
            </span>
        );
    }
    if (role === "school_admin") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <ShieldCheck className="w-3 h-3" />
                {label}
                {isPrimary && " (Primary)"}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100">
            <GraduationCap className="w-3 h-3" />
            {label}
        </span>
    );
}

/* ─── ProfileBadge ─── */

export function ProfileBadge({ hasProfile }: { hasProfile: boolean }) {
    if (hasProfile) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-3 h-3" />
                มีโปรไฟล์
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
            <XCircle className="w-3 h-3" />
            ยังไม่มีโปรไฟล์
        </span>
    );
}
