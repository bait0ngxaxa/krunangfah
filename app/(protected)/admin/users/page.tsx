import { requireAuth } from "@/lib/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "จัดการบัญชีบุคลากร | โครงการครูนางฟ้า",
    description: "ดูข้อมูลบัญชีบุคลากรในระบบ",
};

interface AdminUsersPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({
    searchParams,
}: AdminUsersPageProps) {
    const session = await requireAuth();

    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    redirect(buildSystemRedirect(await searchParams, "users"));
}

function buildSystemRedirect(
    params: Record<string, string | string[] | undefined>,
    tab: string,
): string {
    const next = new URLSearchParams({ tab });
    const query = getFirstParam(params.search) ?? getFirstParam(params.q);
    if (query) next.set("q", query);
    next.set("entityType", "staff");
    return `/admin/system?${next.toString()}`;
}

function getFirstParam(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}
