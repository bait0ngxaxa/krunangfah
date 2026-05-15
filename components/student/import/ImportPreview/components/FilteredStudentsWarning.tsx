import { AlertTriangle } from "lucide-react";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { PreviewStudent } from "../types";

interface FilteredStudentsWarningProps {
    students: PreviewStudent[];
    advisoryClass: string | null;
    validClassNames: string[];
    isClassScoped: boolean;
}

function StudentList({ students }: { students: PreviewStudent[] }) {
    return (
        <ul className="space-y-1 text-sm text-amber-800">
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
        <div>
            <p className="mb-2 text-sm text-amber-700">
                ห้องเรียนของนักเรียนต่อไปนี้ยังไม่ถูกสร้างในระบบ กรุณาไปสร้างห้องเรียนก่อนนำเข้า
            </p>
            {validClassNames.length > 0 && (
                <p className="mb-2 text-xs text-amber-700">
                    ห้องที่มีอยู่ตอนนี้:{" "}
                    <span className="font-bold">
                        {validClassNames.join(", ")}
                    </span>
                </p>
            )}
            <StudentList students={students} />
        </div>
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
        <div>
            <p className="mb-2 text-sm text-amber-700">
                นักเรียนต่อไปนี้จะไม่ถูกนำเข้า เพราะไม่ใช่ห้องที่คุณดูแล{" "}
                <span className="font-bold">{advisoryClass}</span>
            </p>
            <StudentList students={students} />
        </div>
    );
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
    if (students.length === 0) {
        return null;
    }

    const validClassSet = new Set(validClassNames.map(normalizeClassName));
    const missingClassStudents = students.filter(
        (student) => !validClassSet.has(normalizeClassName(student.class)),
    );
    const outOfScopeStudents = isClassScoped
        ? students.filter((student) =>
              validClassSet.has(normalizeClassName(student.class)),
          )
        : [];
    const title =
        missingClassStudents.length > 0
            ? `พบห้องเรียนที่ยังไม่ได้สร้างในระบบ (${missingClassStudents.length} คน)`
            : `พบนักเรียนที่ไม่ตรงกับห้องที่คุณดูแล (${outOfScopeStudents.length} คน)`;

    return (
        <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-2">
                        {title}
                    </p>
                    <div className="max-h-40 space-y-3 overflow-y-auto rounded bg-amber-100/50 p-3">
                        <MissingClassSection
                            students={missingClassStudents}
                            validClassNames={validClassNames}
                        />
                        <OutOfScopeClassSection
                            students={outOfScopeStudents}
                            advisoryClass={advisoryClass}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
