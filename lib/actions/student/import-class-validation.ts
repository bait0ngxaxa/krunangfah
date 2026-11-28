import { normalizeClassName } from "@/lib/utils/class-normalizer";

interface ImportClassRecord {
    name: string;
    archivedAt?: Date | null;
}

/**
 * Splits a school's classes into those an import may target and archived
 * ones, so an archived class gets its own actionable error instead of the
 * generic unknown-class message.
 */
export function partitionImportClasses(
    classes: ReadonlyArray<ImportClassRecord>,
): { validClassSet: Set<string>; archivedClassSet: Set<string> } {
    const validClassSet = new Set<string>();
    const archivedClassSet = new Set<string>();
    for (const schoolClass of classes) {
        const name = normalizeClassName(schoolClass.name);
        (schoolClass.archivedAt ? archivedClassSet : validClassSet).add(name);
    }
    return { validClassSet, archivedClassSet };
}

export function archivedImportClassMessage(className: string): string {
    return `ห้อง "${className}" ถูกเก็บเข้าคลังแล้ว กรุณาเพิ่มห้องนี้อีกครั้งในหน้าจัดการห้องเรียนก่อนนำเข้า`;
}
