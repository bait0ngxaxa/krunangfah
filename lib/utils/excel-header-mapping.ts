/**
 * Resolves import fields to worksheet columns once per file.
 *
 * Matching is deterministic and one-to-one: a field that could mean more
 * than one column, or a column claimed by more than one field, is reported
 * instead of silently reading the wrong data.
 */

export interface ImportHeaderField<K extends string> {
    key: K;
    label: string;
    aliases: readonly string[];
}

export interface WorksheetHeader {
    header: string;
    column: number;
}

export type HeaderResolution<K extends string> =
    | { ok: true; columns: ReadonlyMap<K, number> }
    | { ok: false; errors: string[] };

type FieldMatch =
    | { kind: "column"; column: number }
    | { kind: "missing" }
    | { kind: "ambiguous"; headers: string[] };

// Google Forms prefixes numbered questions with "1. " or "1) ".
const NUMBERING_PREFIX = /^\d+[.)]\s*/;

export function normalizeHeader(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function distinctColumns(candidates: readonly WorksheetHeader[]): WorksheetHeader[] {
    return [...new Map(candidates.map((entry) => [entry.column, entry])).values()];
}

function toMatch(candidates: readonly WorksheetHeader[]): FieldMatch | undefined {
    const distinct = distinctColumns(candidates);
    if (distinct.length === 0) return undefined;
    if (distinct.length === 1) return { kind: "column", column: distinct[0].column };
    return { kind: "ambiguous", headers: distinct.map((entry) => entry.header) };
}

/** The first alias with any candidate decides; several columns for that alias are ambiguous. */
function matchByAlias(
    headers: readonly WorksheetHeader[],
    aliases: readonly string[],
    matches: (header: string, alias: string) => boolean,
): FieldMatch | undefined {
    for (const alias of aliases) {
        const match = toMatch(headers.filter((entry) => matches(entry.header, alias)));
        if (match) return match;
    }
    return undefined;
}

function matchField(
    headers: readonly WorksheetHeader[],
    rawAliases: readonly string[],
): FieldMatch {
    // Declared order is the priority for exact tiers (e.g. "ข้อ9a" before the legacy "opt1").
    const aliases = [...new Set(rawAliases.map(normalizeHeader))];
    // Longest alias first for substrings so "เพศกำเนิด" beats the broader "เพศ".
    const longestFirst = [...aliases].sort((a, b) => b.length - a.length);
    return (
        matchByAlias(headers, aliases, (header, alias) => header === alias) ??
        matchByAlias(
            headers,
            aliases,
            (header, alias) => header.replace(NUMBERING_PREFIX, "") === alias,
        ) ??
        matchByAlias(headers, longestFirst, (header, alias) => header.includes(alias)) ?? {
            kind: "missing",
        }
    );
}

function quoteList(values: readonly string[]): string {
    return values.map((value) => `"${value}"`).join(", ");
}

function sharedColumnErrors<K extends string>(
    headers: readonly WorksheetHeader[],
    fields: readonly ImportHeaderField<K>[],
    columns: ReadonlyMap<K, number>,
): string[] {
    const labelsByColumn = new Map<number, string[]>();
    for (const field of fields) {
        const column = columns.get(field.key);
        if (column === undefined) continue;
        labelsByColumn.set(column, [...(labelsByColumn.get(column) ?? []), field.label]);
    }

    const headerByColumn = new Map(headers.map((entry) => [entry.column, entry.header]));
    return [...labelsByColumn]
        .filter(([, labels]) => labels.length > 1)
        .map(([column, labels]) => {
            const header = headerByColumn.get(column) ?? "";
            const firstLabels = labels.slice(0, -1).join(", ");
            const lastLabel = labels[labels.length - 1];
            return `คอลัมน์ "${header}" ถูกใช้เป็นทั้ง ${firstLabels} และ ${lastLabel} กรุณาแยกเป็นคอลัมน์ละหนึ่งข้อมูล`;
        });
}

/**
 * Per field, the first tier with any candidate wins:
 * 1. exact alias, 2. exact alias after a numbering prefix, 3. substring (longest alias first).
 */
export function resolveHeaderColumns<K extends string>(
    rawHeaders: readonly WorksheetHeader[],
    fields: readonly ImportHeaderField<K>[],
): HeaderResolution<K> {
    const headers = rawHeaders
        .map((entry) => ({ header: normalizeHeader(entry.header), column: entry.column }))
        .filter((entry) => entry.header.length > 0);
    const errors: string[] = [];
    const columns = new Map<K, number>();

    for (const field of fields) {
        const match = matchField(headers, field.aliases);
        if (match.kind === "column") {
            columns.set(field.key, match.column);
        } else if (match.kind === "missing") {
            errors.push(`ไม่พบคอลัมน์ "${field.label}" ในไฟล์`);
        } else {
            errors.push(
                `พบหลายคอลัมน์ที่อาจเป็น "${field.label}": ${quoteList(match.headers)} กรุณาเปลี่ยนชื่อหัวคอลัมน์ให้เหลือคอลัมน์เดียว`,
            );
        }
    }

    errors.push(...sharedColumnErrors(headers, fields, columns));
    return errors.length > 0 ? { ok: false, errors } : { ok: true, columns };
}
