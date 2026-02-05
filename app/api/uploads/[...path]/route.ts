/**
 * File Serving API Route
 *
 * Security:
 * - Path traversal protection (resolves and validates path stays within uploads dir)
 * - Authentication required
 * - Extension whitelist
 * - Content-Disposition header to prevent inline execution
 */

import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve, normalize } from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";

/** Allowed file extensions for serving */
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);

/** Content-Type mapping by extension */
const CONTENT_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
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
            (segment) => segment === ".." || segment === "." || segment.includes("\0"),
        );
        if (hasDotSegment) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Build and validate the resolved path stays within uploads directory
        const uploadsDir = resolve(process.cwd(), "public", "uploads");
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

        // Read file
        const fileBuffer = await readFile(filePath);
        const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

        // Determine filename for Content-Disposition
        const fileName = path[path.length - 1];

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Cache-Control": "private, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Error serving file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
