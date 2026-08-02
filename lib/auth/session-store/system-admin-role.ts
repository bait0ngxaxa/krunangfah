import { prisma } from "@/lib/database/prisma";
import { normalizeEmail } from "@/lib/utils/email";
import type { UserRole } from "@/types/auth.types";

export async function syncSystemAdminRole(user: {
    id: string;
    email: string;
    role: UserRole;
}): Promise<UserRole> {
    const email = normalizeEmail(user.email);
    const whitelisted = await prisma.systemAdminWhitelist.findUnique({
        where: { email, isActive: true },
        select: { id: true },
    });

    if (whitelisted && user.role !== "system_admin") {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: "system_admin" },
        });
        return "system_admin";
    }

    if (!whitelisted && user.role === "system_admin") {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: "school_admin" },
        });
        return "school_admin";
    }

    return user.role;
}
