import type { SystemEditResponse } from "./types";

export const CARE_RECORD_STALE_MESSAGE =
    "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดและลองใหม่";

export function staleCareRecordResponse(): SystemEditResponse<never> {
    return { success: false, message: CARE_RECORD_STALE_MESSAGE };
}
