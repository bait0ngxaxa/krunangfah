import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/session";

export const metadata: Metadata = {
    title: "ศูนย์จัดการข้อมูล | โครงการครูนางฟ้า",
    description: "จัดการข้อมูลเลิกใช้งานและข้อมูลทดสอบ",
};

interface DataManagementPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DataManagementPage({
    searchParams,
}: DataManagementPageProps) {
    const session = await requireAuth();
    if (session.user.role !== "system_admin") {
        redirect("/dashboard");
    }

    redirect(buildSystemRedirect(await searchParams, "data"));
}

function buildSystemRedirect(
    params: Record<string, string | string[] | undefined>,
    tab: string,
): string {
    const next = new URLSearchParams({ tab });
    const query =
        getFirstParam(params.q) ??
        getFirstParam(params.query) ??
        getFirstParam(params.search);
    const targetType =
        getFirstParam(params.targetType) ?? getFirstParam(params.entityType);
    const dataState = getFirstParam(params.dataState);
    if (query) next.set("q", query);
    const entityType = normalizeEntityType(targetType);
    if (entityType) {
        next.set("entityType", entityType);
    }
    if (dataState) next.set("dataState", dataState);
    return `/admin/system?${next.toString()}`;
}

function getFirstParam(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

function normalizeEntityType(value: string | null): string | null {
    if (value === "user" || value === "teacher") return "staff";
    if (value === "school" || value === "staff" || value === "student") {
        return value;
    }
    return null;
}
