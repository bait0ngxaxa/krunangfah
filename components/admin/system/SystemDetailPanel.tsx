"use client";

import { useState } from "react";
import {
    Building2,
    Pencil,
    GraduationCap,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import type {
    SystemEntityResult,
    SystemSearchResult,
} from "@/lib/actions/system-admin/types";
import { Button } from "@/components/ui/Button";
import {
    getGenderLabel,
    getProjectRoleLabel,
    getRoleLabel,
    getStudentStatusLabel,
} from "./labels";
import { StatusBadge } from "./StatusBadge";
import { SystemCareRecordsPanel } from "./SystemCareRecordsPanel";
import { SystemDataManagementSection } from "./SystemDataManagementSection";
import { SystemEditForm } from "./SystemEditForm";
import { SystemStaffActions } from "./SystemStaffActions";
import { SystemTeacherProfileForm } from "./SystemTeacherProfileForm";

interface DetailItem {
    label: string;
    value: string;
}

interface DetailSection {
    title: string;
    items: DetailItem[];
}

interface SystemDetailPanelProps {
    entity: SystemEntityResult | null;
    onEntityUpdated: (entity: SystemEntityResult) => void;
    onEntityRemoved: (entity: SystemEntityResult) => void;
    onRefreshSearch: () => Promise<SystemSearchResult>;
}

export function SystemDetailPanel({
    entity,
    onEntityUpdated,
    onEntityRemoved,
    onRefreshSearch,
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
                    ค้นหาแล้วเลือกข้อมูลเพื่อดูรายละเอียดและจัดการจากหน้านี้
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

            {entity.type === "staff" ? (
                <StaffDetailSections entity={entity} />
            ) : (
                <DetailGrid items={getDetails(entity)} />
            )}

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
                {canEditTeacherProfile(entity) ? (
                    <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        className="justify-between"
                        onClick={() => setIsEditing((current) => !current)}
                    >
                        <span>
                            {isEditing
                                ? "ปิดฟอร์มแก้ไขโปรไฟล์ครู"
                                : "แก้ไขโปรไฟล์ครู"}
                        </span>
                        <Pencil className="h-4 w-4" />
                    </Button>
                ) : null}
            </div>
            {isEditing && canEdit(entity) ? (
                <SystemEditForm
                    key={`${entity.type}:${entity.id}`}
                    entity={entity}
                    onSaved={onEntityUpdated}
                    onCancel={() => setIsEditing(false)}
                />
            ) : null}
            {isEditing && canEditTeacherProfile(entity) ? (
                <SystemTeacherProfileForm
                    key={`teacher:${entity.id}`}
                    entity={entity}
                    onSaved={onEntityUpdated}
                    onCancel={() => setIsEditing(false)}
                />
            ) : null}
            {entity.type === "staff" ? (
                <SystemStaffActions
                    entity={entity}
                    onEntityUpdated={onEntityUpdated}
                    onEntityRemoved={() => onEntityRemoved(entity)}
                    onRefreshSearch={onRefreshSearch}
                />
            ) : null}
            {entity.type === "school" || entity.type === "student" ? (
                <SystemDataManagementSection
                    entity={entity}
                    onEntityRemoved={() => onEntityRemoved(entity)}
                    onEntityUpdated={onEntityUpdated}
                    onRefreshSearch={onRefreshSearch}
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

function canEditTeacherProfile(
    entity: SystemEntityResult,
): entity is Extract<SystemEntityResult, { type: "staff" }> {
    return entity.type === "staff" && entity.hasTeacherProfile && !entity.deletedAt;
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
        case "staff":
            return entity.teacherName ?? entity.name ?? entity.email;
        case "student":
            return `${entity.firstName} ${entity.lastName}`;
    }
}

function getSubtitle(entity: SystemEntityResult): string {
    switch (entity.type) {
        case "school":
            return entity.province ?? "ไม่ระบุจังหวัด";
        case "staff":
            return `${entity.email} · ${entity.schoolName ?? "ไม่ระบุโรงเรียน"}`;
        case "student":
            return `${entity.studentId} · ${entity.schoolName}`;
    }
}

function getDetails(entity: SystemEntityResult): DetailItem[] {
    switch (entity.type) {
        case "school":
            return [
                { label: "จังหวัด", value: entity.province ?? "-" },
                { label: "บัญชีบุคลากร", value: `${entity.userCount} บัญชี` },
                { label: "นักเรียน", value: `${entity.studentCount} คน` },
                { label: "รหัสโรงเรียน", value: entity.id },
            ];
        case "staff":
            return getStaffDetailSections(entity).flatMap((section) => section.items);
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
            ? { label: "ปิดบัญชีแล้ว", tone: "danger" }
            : { label: "เข้าใช้งานได้", tone: "success" },
        getStaffRoleBadge(entity),
    ];
}

function getStaffRoleBadge(
    entity: Extract<SystemEntityResult, { type: "staff" }>,
): { label: string; tone: "neutral" | "success" | "warning" | "danger" } {
    const label = getRoleLabel(entity.role, { isPrimary: entity.isPrimary });
    return { label, tone: entity.isPrimary ? "success" : "neutral" };
}

function StaffDetailSections({
    entity,
}: {
    entity: Extract<SystemEntityResult, { type: "staff" }>;
}) {
    return (
        <div className="mt-5 space-y-4">
            {getStaffDetailSections(entity).map((section) => (
                <section key={section.title}>
                    <h3 className="mb-2 text-sm font-extrabold text-gray-900">
                        {section.title}
                    </h3>
                    <DetailGrid items={section.items} />
                </section>
            ))}
        </div>
    );
}

function DetailGrid({ items }: { items: DetailItem[] }) {
    return (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
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
    );
}

function getStaffDetailSections(
    entity: Extract<SystemEntityResult, { type: "staff" }>,
): DetailSection[] {
    return [
        {
            title: "ข้อมูลบัญชี",
            items: [
                {
                    label: "บทบาทบัญชี",
                    value: getRoleLabel(entity.role, {
                        isPrimary: entity.isPrimary,
                    }),
                },
                { label: "โรงเรียน", value: entity.schoolName ?? "-" },
                { label: "อีเมลบัญชี", value: entity.email },
                { label: "รหัสบัญชี", value: entity.id },
            ],
        },
        {
            title: "โปรไฟล์ครู",
            items: [
                { label: "ชื่อครู", value: entity.teacherName ?? "-" },
                { label: "ห้องที่ปรึกษา", value: entity.advisoryClass ?? "-" },
                {
                    label: "บทบาทโครงการ",
                    value: entity.projectRole
                        ? getProjectRoleLabel(entity.projectRole)
                        : "-",
                },
                { label: "บทบาทในโรงเรียน", value: entity.schoolRole ?? "-" },
            ],
        },
    ];
}
