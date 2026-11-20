export const NATIONAL_ID_ERROR_MESSAGE =
    "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก หรือ G ตามด้วยตัวเลข 13 หลัก";

export const NATIONAL_ID_PATTERN = /^(?:\d{13}|G\d{13})$/;

const NATIONAL_ID_INPUT_PATTERN = /^(?:\d{0,13}|G\d{0,13})$/;

export function normalizeNationalId(value: string): string {
    return value.replace(/[-\s]/g, "").replace(/^g/, "G");
}

export function normalizeOptionalNationalId(
    value: string | null | undefined,
): string | null {
    if (value === null || value === undefined) return null;
    const normalized = normalizeNationalId(value);
    return normalized === "" ? null : normalized;
}

export function normalizeImportNationalId(
    value: string | null | undefined,
): string | null {
    if (value === null || value === undefined || value.trim() === "") return null;
    return normalizeNationalId(value);
}

export function isValidNationalId(value: string): boolean {
    return NATIONAL_ID_PATTERN.test(value);
}

export function normalizeNationalIdInput(value: string): string | null {
    const normalized = normalizeNationalId(value);
    return NATIONAL_ID_INPUT_PATTERN.test(normalized) ? normalized : null;
}

export function maskNationalId(nationalId: string | null): string | null {
    if (!nationalId) return null;
    const prefix = nationalId.startsWith("G") ? "G" : "";
    return `${prefix}*********${nationalId.slice(-4)}`;
}

export function redactNationalIds(value: string): string {
    return value.replace(/(?<![A-Za-z0-9])[Gg]?\d[\d \t-]*/g, (match) => {
        const token = match.trimEnd();
        const normalized = normalizeNationalId(token);
        const digits = normalized.startsWith("G") ? normalized.length - 1 : normalized.length;
        if (digits < 13) return match;
        const masked = isValidNationalId(normalized) ? maskNationalId(normalized) : null;
        return `${masked ?? "[เลขประจำตัว]"}${match.slice(token.length)}`;
    });
}
