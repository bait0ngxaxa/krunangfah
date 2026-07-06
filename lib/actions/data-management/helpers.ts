import { existsSync } from "fs";
import { unlink } from "fs/promises";
import { normalize, resolve } from "path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { logError } from "@/lib/utils/logging";
import type { DataManagementEventItem, ImpactSummary } from "./types";

export const DATA_MANAGEMENT_PATH = "/admin/data-management";

export function maskNationalId(nationalId: string | null): string | null {
    if (!nationalId) return null;
    const suffix = nationalId.slice(-4);
    return `*********${suffix}`;
}

export function createEmptyImpact(): ImpactSummary {
    return {
        userCount: 0,
        studentCount: 0,
        activeStudentCount: 0,
        phqResultCount: 0,
        activityProgressCount: 0,
        counselingSessionCount: 0,
        homeVisitCount: 0,
        worksheetUploadCount: 0,
        homeVisitPhotoCount: 0,
        pendingTeacherInviteCount: 0,
        pendingSchoolAdminInviteCount: 0,
        fileCount: 0,
    };
}

export function impactToJsonObject(
    impact: ImpactSummary,
): Prisma.InputJsonObject {
    return {
        userCount: impact.userCount,
        studentCount: impact.studentCount,
        activeStudentCount: impact.activeStudentCount,
        phqResultCount: impact.phqResultCount,
        activityProgressCount: impact.activityProgressCount,
        counselingSessionCount: impact.counselingSessionCount,
        homeVisitCount: impact.homeVisitCount,
        worksheetUploadCount: impact.worksheetUploadCount,
        homeVisitPhotoCount: impact.homeVisitPhotoCount,
        pendingTeacherInviteCount: impact.pendingTeacherInviteCount,
        pendingSchoolAdminInviteCount: impact.pendingSchoolAdminInviteCount,
        fileCount: impact.fileCount,
    };
}

export function toEventItem(event: {
    id: string;
    targetType: "school" | "student";
    targetId: string;
    action: Prisma.DataManagementEventGetPayload<object>["action"];
    reason: string;
    actorUserId: string;
    actorSnapshot: Prisma.JsonValue;
    targetSnapshot: Prisma.JsonValue;
    warnings: Prisma.JsonValue | null;
    createdAt: Date;
}): DataManagementEventItem {
    const actor = readObject(event.actorSnapshot);
    const target = readObject(event.targetSnapshot);
    return {
        id: event.id,
        targetType: event.targetType,
        targetId: event.targetId,
        action: event.action,
        reason: event.reason,
        actorUserId: event.actorUserId,
        actorEmail: readString(actor.email),
        targetLabel: readString(target.label) ?? event.targetId,
        warnings: readStringArray(event.warnings),
        createdAt: event.createdAt,
    };
}

export function createActorSnapshot(actor: {
    id: string;
    email?: string | null;
    name?: string | null;
    role: string;
}): Prisma.InputJsonObject {
    return {
        id: actor.id,
        email: actor.email ?? null,
        name: actor.name ?? null,
        role: actor.role,
    };
}

export async function listRecentEvents(
    targetType: "school" | "student",
    targetId: string,
    take = 3,
): Promise<DataManagementEventItem[]> {
    const events = await prisma.dataManagementEvent.findMany({
        where: { targetType, targetId },
        orderBy: { createdAt: "desc" },
        take,
    });

    return events.map(toEventItem);
}

export function fileUrlToLocalPath(fileUrl: string): string | null {
    const prefix = "/api/uploads/";
    if (!fileUrl.startsWith(prefix)) return null;
    const relativePath = fileUrl.slice(prefix.length);
    if (
        relativePath.includes("\0") ||
        relativePath.split("/").some((segment) => segment === "." || segment === "..")
    ) {
        return null;
    }

    const uploadsDir = resolve(process.cwd(), ".data", "uploads");
    const filePath = normalize(resolve(uploadsDir, relativePath));
    return filePath.startsWith(uploadsDir) ? filePath : null;
}

export async function deleteFilesByUrl(fileUrls: string[]): Promise<string[]> {
    const warnings: string[] = [];
    const uniqueUrls = Array.from(new Set(fileUrls));

    for (const fileUrl of uniqueUrls) {
        const filePath = fileUrlToLocalPath(fileUrl);
        if (!filePath) {
            warnings.push(`ไม่สามารถแปลง path ไฟล์: ${fileUrl}`);
            continue;
        }

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is resolved under .data/uploads from a DB fileUrl
            if (existsSync(filePath)) {
                // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is resolved under .data/uploads from a DB fileUrl
                await unlink(filePath);
            }
        } catch (error) {
            logError("Delete managed file error:", error);
            warnings.push(`ลบไฟล์ไม่สำเร็จ: ${fileUrl}`);
        }
    }

    return warnings;
}

function readObject(value: Prisma.JsonValue): Prisma.JsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value;
}

function readString(value: Prisma.JsonValue | undefined): string | null {
    return typeof value === "string" ? value : null;
}

function readStringArray(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}
