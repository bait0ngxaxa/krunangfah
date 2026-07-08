import { existsSync } from "fs";
import { unlink } from "fs/promises";
import { normalize, resolve } from "path";
import { logError } from "@/lib/utils/logging";

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

    const uploadsDir = resolve(
        /* turbopackIgnore: true */ process.cwd(),
        ".data",
        "uploads",
    );
    const filePath = normalize(
        resolve(/* turbopackIgnore: true */ uploadsDir, relativePath),
    );
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
            if (existsSync(/* turbopackIgnore: true */ filePath)) {
                // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is resolved under .data/uploads from a DB fileUrl
                await unlink(/* turbopackIgnore: true */ filePath);
            }
        } catch (error) {
            logError("Delete managed file error:", error);
            warnings.push(`ลบไฟล์ไม่สำเร็จ: ${fileUrl}`);
        }
    }

    return warnings;
}
