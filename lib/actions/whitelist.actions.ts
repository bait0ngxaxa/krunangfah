"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { whitelistEmailSchema } from "@/lib/validations/whitelist.validation";
import type {
    WhitelistEntry,
    WhitelistActionResponse,
} from "@/types/whitelist.types";

const WHITELIST_PATH = "/admin/whitelist";

/**
 * ดึงรายการ whitelist ทั้งหมด (system_admin only)
 */
export async function getWhitelistEntries(): Promise<WhitelistEntry[]> {
    await requireAdmin();

    const entries = await prisma.systemAdminWhitelist.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            isActive: true,
            createdAt: true,
        },
    });

    return entries;
}

/**
 * เพิ่ม email ใหม่เข้า whitelist (system_admin only)
 */
export async function addWhitelistEntry(
    input: { email: string },
): Promise<WhitelistActionResponse> {
    try {
        await requireAdmin();

        const validated = whitelistEmailSchema.parse(input);

        // Check duplicate
        const existing = await prisma.systemAdminWhitelist.findUnique({
            where: { email: validated.email },
        });

        if (existing) {
            return {
                success: false,
                message: "อีเมลนี้มีอยู่ใน whitelist แล้ว",
            };
        }

        const entry = await prisma.systemAdminWhitelist.create({
            data: { email: validated.email },
            select: {
                id: true,
                email: true,
                isActive: true,
                createdAt: true,
            },
        });

        revalidatePath(WHITELIST_PATH);

        return {
            success: true,
            message: "เพิ่มอีเมลสำเร็จ",
            data: entry,
        };
    } catch (error) {
        console.error("Error adding whitelist entry:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการเพิ่มอีเมล",
        };
    }
}

/**
 * ลบ email ออกจาก whitelist (system_admin only)
 */
export async function removeWhitelistEntry(
    id: string,
): Promise<WhitelistActionResponse> {
    try {
        await requireAdmin();

        const entry = await prisma.systemAdminWhitelist.findUnique({
            where: { id },
        });

        if (!entry) {
            return {
                success: false,
                message: "ไม่พบรายการที่ต้องการลบ",
            };
        }

        await prisma.systemAdminWhitelist.delete({
            where: { id },
        });

        revalidatePath(WHITELIST_PATH);

        return {
            success: true,
            message: "ลบอีเมลสำเร็จ",
        };
    } catch (error) {
        console.error("Error removing whitelist entry:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการลบอีเมล",
        };
    }
}

/**
 * เปิด/ปิด isActive ของ whitelist entry (system_admin only)
 */
export async function toggleWhitelistEntry(
    id: string,
): Promise<WhitelistActionResponse> {
    try {
        await requireAdmin();

        const entry = await prisma.systemAdminWhitelist.findUnique({
            where: { id },
            select: { id: true, isActive: true },
        });

        if (!entry) {
            return {
                success: false,
                message: "ไม่พบรายการที่ต้องการแก้ไข",
            };
        }

        const updated = await prisma.systemAdminWhitelist.update({
            where: { id },
            data: { isActive: !entry.isActive },
            select: {
                id: true,
                email: true,
                isActive: true,
                createdAt: true,
            },
        });

        revalidatePath(WHITELIST_PATH);

        const statusText = updated.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน";
        return {
            success: true,
            message: `${statusText}อีเมลสำเร็จ`,
            data: updated,
        };
    } catch (error) {
        console.error("Error toggling whitelist entry:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการแก้ไขสถานะ",
        };
    }
}
