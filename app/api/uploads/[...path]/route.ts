import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve, normalize } from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Allowed file extensions for serving (must match upload whitelist) */
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

function getContentType(ext: string): string {
    switch (ext) {
        case "jpg":
        case "jpeg": return "image/jpeg";
        case "png":  return "image/png";
        case "pdf":  return "application/pdf";
        default:     return "application/octet-stream";
    }
}

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
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath validated via startsWith(uploadsDir) and extension whitelist above
        if (!existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        // Verify file ownership for home-visits
        if (path[0] === "home-visits") {
            const fileUrl = `/api/uploads/${path.join("/")}`;

            const photo = await prisma.homeVisitPhoto.findFirst({
                where: { fileUrl },
                include: {
                    homeVisit: {
                        include: {
                            student: {
                                select: {
                                    schoolId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!photo) {
                return new NextResponse("File not found", { status: 404 });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    schoolId: true,
                    role: true,
                },
            });

            if (user?.role !== "system_admin") {
                if (
                    !user?.schoolId ||
                    user.schoolId !== photo.homeVisit.student.schoolId
                ) {
                    return new NextResponse("Forbidden", { status: 403 });
                }
            }
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
                },
            });

            // system_admin / school_admin can view all files (school_admin scoped to own school)
            // class_teacher: schoolId check only — UI already filters by advisory class
            if (user?.role !== "system_admin") {
                if (
                    !user?.schoolId ||
                    user.schoolId !==
                        worksheet.activityProgress.student.schoolId
                ) {
                    return new NextResponse("Forbidden", { status: 403 });
                }
            }
        }

        // Read file
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath validated via startsWith(uploadsDir) and extension whitelist above
        const fileBuffer = await readFile(filePath);
        const contentType = getContentType(ext);

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
