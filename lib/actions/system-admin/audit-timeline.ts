import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { toEventItem } from "@/lib/actions/data-management/helpers";
import type { DataManagementEventItem } from "@/lib/actions/data-management/types";
import type { SystemAuditTimelineInput } from "@/lib/validations/system-admin.validation";
import type {
    SystemAdminEditEventItem,
    SystemAuditTimelineCursor,
    SystemAuditTimelineItem,
    SystemAuditTimelineResponse,
} from "./types";
import { toSystemAdminEditEventItem } from "./events";

const DATA_ACTION_TERMS = [
    { label: "ข้อมูลทดสอบ", value: "MARK_TEST_DATA" },
    { label: "ยกเลิกข้อมูลทดสอบ", value: "UNMARK_TEST_DATA" },
    { label: "ปิดใช้งาน", value: "DISABLE" },
    { label: "กู้คืน", value: "RESTORE" },
    { label: "ลบถาวร", value: "PERMANENT_DELETE" },
] as const;

const EDIT_ACTION_TERMS = [
    { label: "เพิ่มข้อมูล", value: "CREATE" },
    { label: "ลบข้อมูล", value: "DELETE" },
    { label: "ล้างผลข้อมูล", value: "RESET" },
    { label: "แก้ไขข้อมูล", value: "EDIT" },
] as const;

const DATA_TARGET_TERMS = [
    { label: "โรงเรียน", value: "school" },
    { label: "นักเรียน", value: "student" },
] as const;

const EDIT_TARGET_TERMS = [
    { label: "โรงเรียน", value: "school" },
    { label: "นักเรียน", value: "student" },
    { label: "ผู้ใช้", value: "user" },
    { label: "ครู", value: "teacher" },
    { label: "การให้คำปรึกษา", value: "counselingSession" },
    { label: "เยี่ยมบ้าน", value: "homeVisit" },
    { label: "ผล PHQ", value: "phqResult" },
    { label: "กิจกรรม", value: "activityProgress" },
    { label: "การส่งต่อ", value: "studentReferral" },
] as const;

export async function listSystemAuditTimeline(
    input: SystemAuditTimelineInput,
): Promise<SystemAuditTimelineResponse> {
    const take = input.take;
    const [dataEvents, editEvents] = await Promise.all([
        input.eventKind === "edit"
            ? Promise.resolve([])
            : findDataManagementEvents(input, take + 1),
        input.eventKind === "data-management"
            ? Promise.resolve([])
            : findSystemAdminEvents(input, take + 1),
    ]);
    const timeline = mergeTimeline(dataEvents, editEvents);
    const events = timeline.slice(0, take);
    return {
        success: true,
        message: "โหลดประวัติรวมสำเร็จ",
        events,
        nextCursor: getNextCursor(events, timeline.length > take),
    };
}

async function findDataManagementEvents(
    input: SystemAuditTimelineInput,
    take: number,
): Promise<DataManagementEventItem[]> {
    const events = await prisma.dataManagementEvent.findMany({
        where: buildDataManagementWhere(input),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
    });
    return events.map(toEventItem);
}

async function findSystemAdminEvents(
    input: SystemAuditTimelineInput,
    take: number,
): Promise<SystemAdminEditEventItem[]> {
    const events = await prisma.systemAdminEvent.findMany({
        where: buildSystemAdminWhere(input),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
    });
    return events.map(toSystemAdminEditEventItem);
}

function buildDataManagementWhere(
    input: SystemAuditTimelineInput,
): Prisma.DataManagementEventWhereInput {
    return compactWhere<Prisma.DataManagementEventWhereInput>([
        buildDataDateWhere(input),
        buildDataSearchWhere(input.query),
        buildCursorWhere("data-management", input.cursor),
    ]);
}

function buildSystemAdminWhere(
    input: SystemAuditTimelineInput,
): Prisma.SystemAdminEventWhereInput {
    return compactWhere<Prisma.SystemAdminEventWhereInput>([
        buildEditDateWhere(input),
        buildEditSearchWhere(input.query),
        buildCursorWhere("edit", input.cursor),
    ]);
}

function buildDataDateWhere(
    input: SystemAuditTimelineInput,
): Prisma.DataManagementEventWhereInput {
    const gte = input.dateFrom;
    const lt = input.dateTo ? getNextDate(input.dateTo) : undefined;
    if (!gte && !lt) return {};
    return { createdAt: { gte, lt } };
}

function buildEditDateWhere(
    input: SystemAuditTimelineInput,
): Prisma.SystemAdminEventWhereInput {
    const gte = input.dateFrom;
    const lt = input.dateTo ? getNextDate(input.dateTo) : undefined;
    if (!gte && !lt) return {};
    return { createdAt: { gte, lt } };
}

function buildDataSearchWhere(
    query: string,
): Prisma.DataManagementEventWhereInput {
    const normalized = query.trim();
    if (normalized.length === 0) return {};
    return {
        OR: [
            { reason: { contains: normalized, mode: "insensitive" } },
            { targetId: { contains: normalized, mode: "insensitive" } },
            { actorUserId: { contains: normalized, mode: "insensitive" } },
            { actorSnapshot: dataJsonContains("email", normalized) },
            { targetSnapshot: dataJsonContains("label", normalized) },
            ...matchDataActions(normalized).map((action) => ({ action })),
            ...matchDataTargets(normalized).map((targetType) => ({ targetType })),
        ],
    };
}

function buildEditSearchWhere(query: string): Prisma.SystemAdminEventWhereInput {
    const normalized = query.trim();
    if (normalized.length === 0) return {};
    return {
        OR: [
            { reason: { contains: normalized, mode: "insensitive" } },
            { targetId: { contains: normalized, mode: "insensitive" } },
            { actorUserId: { contains: normalized, mode: "insensitive" } },
            { actorSnapshot: editJsonContains("email", normalized) },
            { targetSnapshot: editJsonContains("label", normalized) },
            ...matchEditActions(normalized).map((action) => ({ action })),
            ...matchEditTargets(normalized).map((targetType) => ({ targetType })),
        ],
    };
}

function dataJsonContains(
    path: string,
    value: string,
): Prisma.JsonFilter<"DataManagementEvent"> {
    return { path: [path], string_contains: value, mode: "insensitive" };
}

function editJsonContains(
    path: string,
    value: string,
): Prisma.JsonFilter<"SystemAdminEvent"> {
    return { path: [path], string_contains: value, mode: "insensitive" };
}

function buildCursorWhere(
    kind: SystemAuditTimelineCursor["kind"],
    cursor: SystemAuditTimelineCursor | undefined,
): { OR?: Array<{ createdAt: { lt: Date } } | { createdAt: Date; id?: { lt: string } }> } {
    if (!cursor) return {};
    if (getKindOrder(kind) < getKindOrder(cursor.kind)) {
        return { OR: [{ createdAt: { lt: cursor.createdAt } }] };
    }
    if (getKindOrder(kind) > getKindOrder(cursor.kind)) {
        return {
            OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt },
            ],
        };
    }
    return {
        OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
    };
}

function compactWhere<T>(items: T[]): T {
    const filtered = items.filter((item) => Object.keys(item ?? {}).length > 0);
    if (filtered.length === 0) return {} as T;
    if (filtered.length === 1) return filtered[0] ?? ({} as T);
    return { AND: filtered } as T;
}

function mergeTimeline(
    dataEvents: DataManagementEventItem[],
    editEvents: SystemAdminEditEventItem[],
): SystemAuditTimelineItem[] {
    return [
        ...dataEvents.map((event) => ({ kind: "data-management", event }) as const),
        ...editEvents.map((event) => ({ kind: "edit", event }) as const),
    ].sort(compareTimelineItem);
}

function compareTimelineItem(
    first: SystemAuditTimelineItem,
    second: SystemAuditTimelineItem,
): number {
    const timeDiff = second.event.createdAt.getTime() - first.event.createdAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    const kindDiff = getKindOrder(first.kind) - getKindOrder(second.kind);
    if (kindDiff !== 0) return kindDiff;
    return second.event.id.localeCompare(first.event.id);
}

function getNextCursor(
    events: SystemAuditTimelineItem[],
    hasMore: boolean,
): SystemAuditTimelineCursor | null {
    if (!hasMore) return null;
    const last = events.at(-1);
    if (!last) return null;
    return {
        kind: last.kind,
        id: last.event.id,
        createdAt: last.event.createdAt,
    };
}

function getNextDate(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
}

function getKindOrder(kind: SystemAuditTimelineCursor["kind"]): number {
    return kind === "edit" ? 0 : 1;
}

function matchDataActions(
    query: string,
): Prisma.DataManagementEventWhereInput["action"][] {
    return DATA_ACTION_TERMS
        .filter((item) => matchesTerm(query, item.label, item.value))
        .map((item) => item.value);
}

function matchEditActions(
    query: string,
): Prisma.SystemAdminEventWhereInput["action"][] {
    return EDIT_ACTION_TERMS
        .filter((item) => matchesTerm(query, item.label, item.value))
        .map((item) => item.value);
}

function matchDataTargets(
    query: string,
): Prisma.DataManagementEventWhereInput["targetType"][] {
    return DATA_TARGET_TERMS
        .filter((item) => matchesTerm(query, item.label, item.value))
        .map((item) => item.value);
}

function matchEditTargets(
    query: string,
): Prisma.SystemAdminEventWhereInput["targetType"][] {
    return EDIT_TARGET_TERMS
        .filter((item) => matchesTerm(query, item.label, item.value))
        .map((item) => item.value);
}

function matchesTerm(query: string, label: string, value: string): boolean {
    const normalized = query.toLowerCase();
    return label.toLowerCase().includes(normalized) ||
        value.toLowerCase().includes(normalized);
}
