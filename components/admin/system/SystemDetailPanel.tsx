"use client";

import Link from "next/link";
import { useState } from "react";
import {
    ArrowRight,
    Building2,
    Pencil,
    GraduationCap,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import type { SystemEntityResult } from "@/lib/actions/system-admin/types";
import { Button } from "@/components/ui/Button";
import {
    getGenderLabel,
    getProjectRoleLabel,
    getRoleLabel,
    getStudentStatusLabel,
} from "./labels";
import { StatusBadge } from "./StatusBadge";
import { SystemCareRecordsPanel } from "./SystemCareRecordsPanel";
import { SystemEditForm } from "./SystemEditForm";

interface SystemDetailPanelProps {
    entity: SystemEntityResult | null;
    onEntityUpdated: (entity: SystemEntityResult) => void;
}

export function SystemDetailPanel({
    entity,
    onEntityUpdated,
}: SystemDetailPanelProps) {
    const [isEditing, setIsEditing] = useState(false);

    if (!entity) {
        return (
            <aside className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm">
                <ShieldCheck className="h-10 w-10 text-emerald-600" />
                <h2 className="mt-3 text-lg font-extrabold text-gray-900">
                    เลือกข้อมูลเพื่อดูรายละเอียด
                </h2>
                <p className="mt-1 max-w-xs text-sm leading-6 text-gray-600">
                    Phase แรกเป็น read-only detail พร้อมทางลัดไป workflow เดิม
                </p>
            </aside>
        );
    }

    return (
        <aside className="min-w-0 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                    <EntityIcon type={entity.type} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-lg font-extrabold text-gray-900">
                        {getTitle(entity)}
                    </h2>
                    <p className="text-sm text-gray-600">{getSubtitle(entity)}</p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {getBadges(entity).map((badge) => (
                    <StatusBadge key={badge.label} tone={badge.tone}>
                        {badge.label}
                    </StatusBadge>
                ))}
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {getDetails(entity).map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                        <dt className="text-xs font-bold text-gray-500">
                            {item.label}
                        </dt>
                        <dd className="mt-1 break-words text-sm font-bold text-gray-900">
                            {item.value}
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="mt-5 space-y-2">
                {canEdit(entity) ? (
                    <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        className="justify-between"
                        onClick={() => setIsEditing((current) => !current)}
                    >
                        <span>{isEditing ? "ปิดฟอร์มแก้ไข" : "แก้ไขข้อมูล"}</span>
                        <Pencil className="h-4 w-4" />
                    </Button>
                ) : null}
                {getShortcuts(entity).map((shortcut) => (
                    <Link
                        key={shortcut.href}
                        href={shortcut.href}
                        className={buttonVariants({
                            variant: shortcut.variant,
                            fullWidth: true,
                            className: "justify-between",
                        })}
                    >
                        <span>{shortcut.label}</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                ))}
            </div>
            {isEditing && canEdit(entity) ? (
                <SystemEditForm
                    key={`${entity.type}:${entity.id}`}
                    entity={entity}
                    onSaved={onEntityUpdated}
                    onCancel={() => setIsEditing(false)}
                />
            ) : null}
            {entity.type === "student" ? (
                <SystemCareRecordsPanel key={entity.id} studentId={entity.id} />
            ) : null}
        </aside>
    );
}

function canEdit(
    entity: SystemEntityResult,
): entity is Extract<SystemEntityResult, { type: "school" | "student" }> {
    return entity.type === "school" || entity.type === "student";
}

function EntityIcon({ type }: { type: SystemEntityResult["type"] }) {
    if (type === "school") return <Building2 className="h-5 w-5" />;
    if (type === "student") return <GraduationCap className="h-5 w-5" />;
    return <UserRound className="h-5 w-5" />;
}

function getTitle(entity: SystemEntityResult): string {
    switch (entity.type) {
        case "school":
            return entity.name;
        case "user":
            return entity.teacherName ?? entity.name ?? entity.email;
        case "teacher":
            return `${entity.firstName} ${entity.lastName}`;
        case "student":
            return `${entity.firstName} ${entity.lastName}`;
    }
}

function getSubtitle(entity: SystemEntityResult): string {
    switch (entity.type) {
        case "school":
            return entity.province ?? "ไม่ระบุจังหวัด";
        case "user":
            return entity.email;
        case "teacher":
            return `${entity.email} · ${entity.schoolName ?? "ไม่ระบุโรงเรียน"}`;
        case "student":
            return `${entity.studentId} · ${entity.schoolName}`;
    }
}

function getDetails(entity: SystemEntityResult): Array<{
    label: string;
    value: string;
}> {
    switch (entity.type) {
        case "school":
            return [
                { label: "จังหวัด", value: entity.province ?? "-" },
                { label: "ผู้ใช้งาน", value: `${entity.userCount} บัญชี` },
                { label: "นักเรียน", value: `${entity.studentCount} คน` },
                { label: "School ID", value: entity.id },
            ];
        case "user":
            return [
                { label: "บทบาท", value: getRoleLabel(entity.role) },
                { label: "โรงเรียน", value: entity.schoolName ?? "-" },
                { label: "ครู", value: entity.teacherName ?? "-" },
                { label: "User ID", value: entity.id },
            ];
        case "teacher":
            return [
                { label: "บทบาทระบบ", value: getRoleLabel(entity.userRole) },
                { label: "บทบาทโครงการ", value: getProjectRoleLabel(entity.projectRole) },
                { label: "ห้องที่ปรึกษา", value: entity.advisoryClass },
                { label: "บทบาทในโรงเรียน", value: entity.schoolRole },
            ];
        case "student":
            return [
                { label: "รหัสนักเรียน", value: entity.studentId },
                { label: "เลขบัตร", value: entity.nationalIdMasked ?? "-" },
                { label: "เพศ", value: getGenderLabel(entity.gender) },
                { label: "อายุ", value: entity.age?.toString() ?? "-" },
                { label: "ห้อง", value: entity.class },
                { label: "สถานะ", value: getStudentStatusLabel(entity.status) },
            ];
    }
}

function getBadges(entity: SystemEntityResult): Array<{
    label: string;
    tone: "neutral" | "success" | "warning" | "danger";
}> {
    if (entity.type === "school") {
        return [
            entity.disabledAt
                ? { label: "ปิดใช้งาน", tone: "danger" }
                : { label: "ใช้งานอยู่", tone: "success" },
            entity.isTestData
                ? { label: "ข้อมูลทดสอบ", tone: "warning" }
                : { label: "ข้อมูลจริง", tone: "neutral" },
        ];
    }
    if (entity.type === "student") {
        return [
            entity.disabledAt
                ? { label: "ปิดใช้งาน", tone: "danger" }
                : { label: "ใช้งานอยู่", tone: "success" },
            entity.isTestData
                ? { label: "ข้อมูลทดสอบ", tone: "warning" }
                : { label: "ข้อมูลจริง", tone: "neutral" },
        ];
    }
    return [
        entity.deletedAt
            ? { label: "ลบผู้ใช้แล้ว", tone: "danger" }
            : { label: "เข้าใช้งานได้", tone: "success" },
    ];
}

function getShortcuts(entity: SystemEntityResult): Array<{
    href: string;
    label: string;
    variant: "primary" | "secondary";
}> {
    if (entity.type === "user" || entity.type === "teacher") {
        return [{ href: "/admin/users", label: "เปิดจัดการผู้ใช้งาน", variant: "primary" }];
    }
    return [
        {
            href: "/admin/data-management",
            label: "เปิดศูนย์จัดการข้อมูล",
            variant: "primary",
        },
        { href: "/admin/users", label: "เปิดจัดการผู้ใช้งาน", variant: "secondary" },
    ];
}
