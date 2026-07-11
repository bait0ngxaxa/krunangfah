import { prisma } from "@/lib/database/prisma";
import type { UserRole } from "@/types/auth.types";

export async function syncSystemAdminRole(user: {
    id: string;
    email: string;
    role: UserRole;
}): Promise<UserRole> {
    const whitelisted = await prisma.systemAdminWhitelist.findUnique({
        where: { email: user.email, isActive: true },
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
