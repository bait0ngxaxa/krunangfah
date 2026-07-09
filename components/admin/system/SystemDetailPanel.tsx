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
    const [editingEntityKey, setEditingEntityKey] = useState<string | null>(null);
    const entityKey = entity ? `${entity.type}:${entity.id}` : "empty";
    const isEditing = editingEntityKey === entityKey;
    const toggleEditing = () => {
        setEditingEntityKey((current) => (current === entityKey ? null : entityKey));
    };
    const closeEditing = () => setEditingEntityKey(null);

    if (!entity) {
        return (
            <aside className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-950">
                    เลือกข้อมูลเพื่อดูรายละเอียด
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">
                    ค้นหาแล้วเลือกข้อมูลจากคอลัมน์ซ้าย เพื่อดูรายละเอียด แก้ไขข้อมูล และตรวจประวัติที่เกี่ยวข้อง
                </p>
            </aside>
        );
    }

    return (
        <aside className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <EntityIcon type={entity.type} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="break-words text-2xl font-semibold leading-tight text-gray-950">
                                {getTitle(entity)}
                            </h2>
                            <p className="mt-1 break-words text-sm leading-6 text-gray-600">
                                {getSubtitle(entity)}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                        {getBadges(entity).map((badge) => (
                            <StatusBadge key={badge.label} tone={badge.tone}>
                                {badge.label}
                            </StatusBadge>
                        ))}
                    </div>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-5">
                    {entity.type === "staff" ? (
                        <StaffDetailSections entity={entity} />
                    ) : (
                        <DetailGrid items={getDetails(entity)} />
                    )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    {canEdit(entity) ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full justify-between sm:w-auto"
                            onClick={toggleEditing}
                            aria-expanded={isEditing}
                        >
                            <span>{isEditing ? "ปิดฟอร์มแก้ไข" : "แก้ไขข้อมูล"}</span>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ) : null}
                    {canEditTeacherProfile(entity) ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full justify-between sm:w-auto"
                            onClick={toggleEditing}
                            aria-expanded={isEditing}
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
                        onCancel={closeEditing}
                    />
                ) : null}
                {isEditing && canEditTeacherProfile(entity) ? (
                    <SystemTeacherProfileForm
                        key={`teacher:${entity.id}`}
                        entity={entity}
                        onSaved={onEntityUpdated}
                        onCancel={closeEditing}
                    />
                ) : null}
            </section>
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
        <div className="space-y-5">
            {getStaffDetailSections(entity).map((section) => (
                <section key={section.title}>
                    <h3 className="mb-2 text-sm font-semibold text-gray-950">
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
        <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="min-w-0 border-b border-gray-100 pb-3"
                >
                    <dt className="text-xs font-medium text-gray-600">
                        {item.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-semibold leading-6 text-gray-950">
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
