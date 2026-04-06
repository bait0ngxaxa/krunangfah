import { join } from "path";

export const UPLOAD_WORKSHEETS_DIR = join(
    process.cwd(),
    ".data",
    "uploads",
    "worksheets",
);

export const UPLOAD_WORKSHEETS_URL_PREFIX = "/api/uploads/worksheets/";

export function buildWorksheetFileUrl(fileName: string): string {
    return `${UPLOAD_WORKSHEETS_URL_PREFIX}${fileName}`;
}

export function extractWorksheetFileName(fileUrl: string): string | null {
    if (!fileUrl.startsWith(UPLOAD_WORKSHEETS_URL_PREFIX)) {
        return null;
    }
    return fileUrl.slice(UPLOAD_WORKSHEETS_URL_PREFIX.length);
}

export function buildWorksheetFilePath(fileName: string): string {
    return join(UPLOAD_WORKSHEETS_DIR, fileName);
}

