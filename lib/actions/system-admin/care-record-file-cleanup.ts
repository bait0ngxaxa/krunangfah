import { deleteFilesByUrl } from "@/lib/actions/data-management/file-storage";
import { logError } from "@/lib/utils/logging";

export const CARE_RECORD_FILE_CLEANUP_WARNING_MESSAGE =
    "สำเร็จ แต่มีไฟล์บางรายการลบไม่สำเร็จ";

export async function cleanupSystemCareRecordFiles(
    fileUrls: string[],
): Promise<boolean> {
    try {
        const warnings = await deleteFilesByUrl(fileUrls);
        if (warnings.length === 0) return false;

        logError("System admin care record file cleanup warnings:", warnings);
        return true;
    } catch (error) {
        logError("System admin care record file cleanup failed:", error);
        return true;
    }
}
