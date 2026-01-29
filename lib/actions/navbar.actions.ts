"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Check if the current teacher has any students
 */
export async function hasStudents(): Promise<boolean> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return false;
        }

        const studentCount = await prisma.student.count({
            where: {
                phqResults: {
                    some: {
                        importedById: session.user.id,
                    },
                },
            },
        });

        return studentCount > 0;
    } catch (error) {
        console.error("Error checking students:", error);
        return false;
    }
}
