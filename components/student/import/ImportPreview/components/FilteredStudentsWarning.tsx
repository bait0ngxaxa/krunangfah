import type { PreviewStudent } from "../types";

interface FilteredStudentsWarningProps {
    students: PreviewStudent[];
    advisoryClass: string | null;
}

/**
 * Warning message for students filtered out (class_teacher only)
 */
export function FilteredStudentsWarning({
    students,
    advisoryClass,
}: FilteredStudentsWarningProps) {
    if (students.length === 0 || !advisoryClass) {
        return null;
    }

    return (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
                <div className="text-amber-600 text-xl mt-0.5">⚠️</div>
                <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-2">
                        พบนักเรียนที่ไม่ตรงกับห้องที่คุณดูแล ({students.length}{" "}
                        คน)
                    </p>
                    <p className="text-sm text-amber-700 mb-2">
                        นักเรียนต่อไปนี้จะไม่ถูกนำเข้าเพราะไม่ใช่ห้อง{" "}
                        <span className="font-bold">{advisoryClass}</span>:
                    </p>
                    <div className="max-h-32 overflow-y-auto bg-white/50 rounded p-2">
                        <ul className="text-sm text-amber-800 space-y-1">
                            {students.map((student, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-center gap-2"
                                >
                                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                                    {student.firstName} {student.lastName} -
                                    ห้อง {student.class}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
