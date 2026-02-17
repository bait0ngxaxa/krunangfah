import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve, normalize } from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Allowed file extensions for serving (must match upload whitelist) */
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

/** Content-Type mapping by extension */
const CONTENT_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    pdf: "application/pdf",
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
    try {
        // Authentication check
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { path } = await params;

        // Reject path segments that try to traverse directories
        const hasDotSegment = path.some(
            (segment) =>
                segment === ".." || segment === "." || segment.includes("\0"),
        );
        if (hasDotSegment) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Build and validate the resolved path stays within uploads directory
        // SECURITY: Files stored in .data/ (not public/) — this API route is the only access path
        const uploadsDir = resolve(process.cwd(), ".data", "uploads");
        const filePath = normalize(join(uploadsDir, ...path));

        if (!filePath.startsWith(uploadsDir)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Validate file extension
        const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return new NextResponse("Forbidden: File type not allowed", {
                status: 403,
            });
        }

        // Check if file exists
        if (!existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        // Verify file ownership for worksheets
        if (path[0] === "worksheets") {
            const fileUrl = `/api/uploads/${path.join("/")}`;

            const worksheet = await prisma.worksheetUpload.findFirst({
                where: { fileUrl },
                include: {
                    activityProgress: {
                        include: {
                            student: {
                                select: {
                                    schoolId: true,
                                    class: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!worksheet) {
                return new NextResponse("File not found", { status: 404 });
            }

            // Verify user has access to this file
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    schoolId: true,
                    role: true,
                    teacher: {
                        select: { advisoryClass: true },
                    },
                },
            });

            // system_admin can access all files
            if (user?.role !== "system_admin") {
                if (
                    !user?.schoolId ||
                    user.schoolId !==
                        worksheet.activityProgress.student.schoolId
                ) {
                    return new NextResponse("Forbidden", { status: 403 });
                }

                // class_teacher: verify student is in their advisory class
                if (user.role === "class_teacher") {
                    const advisoryClass = user.teacher?.advisoryClass;
                    if (
                        !advisoryClass ||
                        worksheet.activityProgress.student.class !==
                            advisoryClass
                    ) {
                        return new NextResponse("Forbidden", { status: 403 });
                    }
                }
            }
        }

        // Read file
        const fileBuffer = await readFile(filePath);
        const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

        // Sanitize filename for Content-Disposition header
        const rawFileName = path[path.length - 1];
        const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${safeFileName}"`,
                "Cache-Control": "private, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Error serving file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
