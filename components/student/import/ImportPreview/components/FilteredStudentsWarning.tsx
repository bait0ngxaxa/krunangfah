import { useMemo, useState } from "react";
import { ImportErrorModal } from "@/components/student/import/ImportErrorModal";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { PreviewStudent } from "../types";

const VISIBLE_CLASS_LIMIT = 6;

interface FilteredStudentsWarningProps {
    students: PreviewStudent[];
    advisoryClass: string | null;
    validClassNames: string[];
    isClassScoped: boolean;
}

function StudentList({ students }: { students: PreviewStudent[] }) {
    return (
        <ul className="space-y-1 text-sm text-amber-900">
            {students.map((student) => (
                <li key={student._originalIndex} className="flex gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span>
                        {student.firstName} {student.lastName} - ห้อง{" "}
                        {student.class}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function ExistingClassSummary({
    validClassNames,
}: {
    validClassNames: string[];
}) {
    if (validClassNames.length === 0) {
        return null;
    }

    const visibleClassNames = validClassNames.slice(0, VISIBLE_CLASS_LIMIT);
    const hiddenClassCount = Math.max(
        validClassNames.length - visibleClassNames.length,
        0,
    );

    return (
        <div className="mb-3 rounded-md border border-amber-200 bg-white/70 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-800">
                    ห้องที่มีอยู่ในระบบ {validClassNames.length} ห้อง
                </span>
                {hiddenClassCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        +{hiddenClassCount} ห้อง
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5">
                {visibleClassNames.map((className) => (
                    <span
                        key={className}
                        className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-800"
                    >
                        {className}
                    </span>
                ))}
            </div>

            {hiddenClassCount > 0 && (
                <details className="mt-2 text-xs text-amber-800">
                    <summary className="cursor-pointer font-semibold hover:text-amber-900">
                        ดูห้องทั้งหมด
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {validClassNames.map((className) => (
                            <span
                                key={className}
                                className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-800"
                            >
                                {className}
                            </span>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

function MissingClassSection({
    students,
    validClassNames,
}: {
    students: PreviewStudent[];
    validClassNames: string[];
}) {
    if (students.length === 0) {
        return null;
    }

    return (
        <section>
            <p className="mb-2 text-sm text-amber-700">
                ห้องเรียนของนักเรียนต่อไปนี้ยังไม่ถูกสร้างในระบบ กรุณาไปสร้างห้องเรียนก่อนนำเข้า
            </p>
            <ExistingClassSummary validClassNames={validClassNames} />
            <StudentList students={students} />
        </section>
    );
}

function OutOfScopeClassSection({
    students,
    advisoryClass,
}: {
    students: PreviewStudent[];
    advisoryClass: string | null;
}) {
    if (students.length === 0 || !advisoryClass) {
        return null;
    }

    return (
        <section>
            <p className="mb-2 text-sm text-amber-700">
                นักเรียนต่อไปนี้จะไม่ถูกนำเข้า เพราะไม่ใช่ห้องที่คุณดูแล{" "}
                <span className="font-bold">{advisoryClass}</span>
            </p>
            <StudentList students={students} />
        </section>
    );
}

function createFilteredStudentsTitle({
    missingCount,
    outOfScopeCount,
}: {
    missingCount: number;
    outOfScopeCount: number;
}): string {
    const totalCount = missingCount + outOfScopeCount;

    if (missingCount > 0 && outOfScopeCount > 0) {
        return `พบนักเรียนที่ยังไม่พร้อมนำเข้า (${totalCount} คน)`;
    }

    if (missingCount > 0) {
        return `พบห้องเรียนที่ยังไม่ได้สร้างในระบบ (${missingCount} คน)`;
    }

    return `พบนักเรียนที่ไม่ตรงกับห้องที่คุณดูแล (${outOfScopeCount} คน)`;
}

/**
 * Warning message for students filtered out (class_teacher only)
 */
export function FilteredStudentsWarning({
    students,
    advisoryClass,
    validClassNames,
    isClassScoped,
}: FilteredStudentsWarningProps) {
    const [dismissedWarningKey, setDismissedWarningKey] = useState<
        string | null
    >(null);
    const warningKey = useMemo(
        () =>
            students
                .map((student) => `${student._originalIndex}:${student.class}`)
                .join("|"),
        [students],
    );
    const isOpen = students.length > 0 && dismissedWarningKey !== warningKey;

    const validClassSet = useMemo(
        () => new Set(validClassNames.map(normalizeClassName)),
        [validClassNames],
    );
    const missingClassStudents = students.filter(
        (student) => !validClassSet.has(normalizeClassName(student.class)),
    );
    const outOfScopeStudents = isClassScoped
        ? students.filter((student) =>
              validClassSet.has(normalizeClassName(student.class)),
          )
        : [];
    const title = createFilteredStudentsTitle({
        missingCount: missingClassStudents.length,
        outOfScopeCount: outOfScopeStudents.length,
    });

    if (students.length === 0 || !isOpen) {
        return null;
    }

    return (
        <ImportErrorModal
            open={isOpen}
            title={title}
            description="รายการเหล่านี้จะไม่ถูกนำเข้า กรุณาตรวจสอบก่อนดำเนินการต่อ"
            onClose={() => setDismissedWarningKey(warningKey)}
            tone="warning"
        >
            <div className="space-y-4">
                <MissingClassSection
                    students={missingClassStudents}
                    validClassNames={validClassNames}
                />
                <OutOfScopeClassSection
                    students={outOfScopeStudents}
                    advisoryClass={advisoryClass}
                />
            </div>
        </ImportErrorModal>
    );
}
