/**
 * Class Name Normalizer Utility
 * Normalize ห้องเรียนให้เป็นรูปแบบมาตรฐาน
 */

/**
 * Normalize ห้องเรียนให้เป็นรูปแบบ ม.X/Y
 *
 * Examples:
 * - "ม. 2/5" → "ม.2/5"
 * - "ม 2/5" → "ม.2/5"
 * - "m.2/5" → "ม.2/5"
 * - "M2/5" → "ม.2/5"
 * - "2/5" → "2/5" (เก็บไว้เพราะอาจเป็นรูปแบบอื่น)
 * - "ป.6/1" → "ป.6/1" (ประถม)
 */
export function normalizeClassName(input: string): string {
    if (!input) return "";

    // ลบ whitespace ที่ไม่จำเป็น
    let result = input.trim().replace(/\s+/g, "");

    // แปลง m หรือ M เป็น ม
    result = result.replace(/^[mM]\.?/i, "ม.");

    // ถ้าขึ้นต้นด้วย ม แต่ไม่มีจุด ให้เพิ่มจุด
    result = result.replace(/^ม([0-9])/, "ม.$1");

    // แปลง p หรือ P เป็น ป (ประถม)
    result = result.replace(/^[pP]\.?/i, "ป.");

    // ถ้าขึ้นต้นด้วย ป แต่ไม่มีจุด ให้เพิ่มจุด
    result = result.replace(/^ป([0-9])/, "ป.$1");

    return result;
}

/**
 * Validate ว่าห้องเรียนอยู่ในรูปแบบที่ถูกต้อง
 * รูปแบบที่รองรับ: ม.X/Y, ป.X/Y, X/Y
 */
export function isValidClassName(input: string): boolean {
    if (!input) return false;

    const normalized = normalizeClassName(input);

    // Pattern: ม.1/1 ถึง ม.6/99 หรือ ป.1/1 ถึง ป.6/99 หรือ 1/1 ถึง 99/99
    const pattern =
        /^(ม\.[1-6]\/[0-9]{1,2}|ป\.[1-6]\/[0-9]{1,2}|[1-9][0-9]?\/[0-9]{1,2})$/;

    return pattern.test(normalized);
}

/**
 * Extract ระดับชั้น จากห้องเรียน
 * "ม.2/5" → "ม.2"
 */
export function extractGradeLevel(className: string): string {
    const normalized = normalizeClassName(className);
    const match = normalized.match(/^(ม\.[1-6]|ป\.[1-6]|[1-9][0-9]?)/);
    return match ? match[1] : "";
}

/**
 * Extract เลขห้อง จากห้องเรียน
 * "ม.2/5" → "5"
 */
export function extractRoomNumber(className: string): string {
    const normalized = normalizeClassName(className);
    const parts = normalized.split("/");
    return parts.length > 1 ? parts[1] : "";
}
