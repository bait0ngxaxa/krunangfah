import { AlertTriangle } from "lucide-react";

interface NumericStudentIdWarningProps {
    count: number;
}

/**
 * Shown once inside the import confirmation. The client cannot tell which
 * numeric codes already match a student, so the copy asks for a check
 * instead of claiming the codes are wrong.
 */
export function NumericStudentIdWarning({ count }: NumericStudentIdWarningProps) {
    return (
        <div
            className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-100 p-4"
            role="note"
            aria-labelledby="numeric-student-id-warning-title"
        >
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div className="space-y-1">
                    <p
                        id="numeric-student-id-warning-title"
                        className="break-words text-sm font-bold text-amber-800"
                    >
                        ข้อควรระวังเกี่ยวกับรหัสนักเรียน
                    </p>
                    <p className="break-words text-xs text-amber-800">
                        พบรหัสนักเรียนที่เป็นตัวเลขจำนวน {count} รายการ Google Sheets
                        หรือ Excel อาจตัดเลขศูนย์นำหน้ารหัสออกโดยอัตโนมัติ
                        กรุณาตรวจว่ารหัสตรงกับทะเบียนของโรงเรียนก่อนกดยืนยัน
                    </p>
                </div>
            </div>
        </div>
    );
}
