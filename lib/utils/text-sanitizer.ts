/**
 * Text Sanitizer Utility
 * Normalize and sanitize text inputs to prevent display issues
 */

/**
 * Sanitize generic text input:
 * - Trim leading/trailing whitespace
 * - Collapse multiple consecutive spaces into one
 * - Remove zero-width characters and other invisible Unicode
 */
export function sanitizeText(input: string): string {
    if (!input) return "";

    return input
        .trim()
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // zero-width chars
        .replace(/\s+/g, " "); // collapse spaces
}

/**
 * Sanitize a person's name (Thai or English):
 * - sanitizeText base
 * - Remove digits and most special characters
 * - Keep Thai, Latin letters, spaces, dots, and hyphens
 */
export function sanitizeName(input: string): string {
    if (!input) return "";

    const cleaned = sanitizeText(input);

    // Allow: Thai chars (ก-๛), Latin letters, spaces, dots, hyphens
    return cleaned.replace(/[^ก-๛a-zA-Z\s.\-]/g, "").trim();
}

/**
 * Normalize school name:
 * - sanitizeText base
 * - Replace common abbreviations: ร.ร., รร., ร.ร → โรงเรียน
 * - Auto-prepend "โรงเรียน" if missing
 */
export function normalizeSchoolName(input: string): string {
    if (!input) return "";

    let name = sanitizeText(input);

    // Replace common abbreviations at the start
    name = name.replace(/^ร\.?ร\.?\s*/, "โรงเรียน");

    // If doesn't start with "โรงเรียน", prepend it
    if (!name.startsWith("โรงเรียน")) {
        name = `โรงเรียน${name}`;
    }

    return name;
}
