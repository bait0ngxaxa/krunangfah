import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Get teacher profile
        const teacher = await prisma.teacher.findUnique({
            where: { userId },
            select: {
                advisoryClass: true,
                user: {
                    select: {
                        role: true,
                    },
                },
            },
        });

        if (!teacher) {
            return NextResponse.json(
                { error: "Teacher profile not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            advisoryClass: teacher.advisoryClass,
            user: {
                role: teacher.user.role,
            },
        });
    } catch (error) {
        console.error("Get teacher profile error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
