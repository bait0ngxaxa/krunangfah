import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CoverageCountMismatch } from "@/lib/actions/analytics/types";

const MAX_LISTED_CLASSES = 5;
const SCHOOL_CLASSES_PATH = "/school/classes";

interface CoverageCountMismatchNoticeProps {
    mismatches: readonly CoverageCountMismatch[];
    uncountedStudents: number;
    /** Primary school admin viewing a term of the current academic year. */
    canEditPlannedCounts: boolean;
}

/**
 * Coverage counts each class up to its planned count, so students screened
 * above it are not in the percentage. Says so instead of hiding it.
 */
export function CoverageCountMismatchNotice({
    mismatches,
    uncountedStudents,
    canEditPlannedCounts,
}: CoverageCountMismatchNoticeProps): React.ReactNode {
    if (mismatches.length === 0) return null;

    const listed = mismatches.slice(0, MAX_LISTED_CLASSES);
    const remaining = mismatches.length - listed.length;

    return (
        <div className="mt-3 space-y-1.5 text-xs text-amber-800" role="note">
            <p className="flex items-start gap-1.5 font-semibold">
                <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden="true"
                />
                <span>
                    {`จำนวนนักเรียนที่ตั้งไว้ของ ${mismatches.length} ห้องน้อยกว่าที่คัดกรองจริง (${uncountedStudents} คนไม่ถูกนับในความครอบคลุม)`}
                </span>
            </p>
            <ul className="space-y-0.5 pl-5">
                {listed.map((row) => (
                    <li key={row.className}>
                        {`${row.className}: ตั้งไว้ ${row.expected} คน · คัดกรองแล้ว ${row.assessed} คน`}
                    </li>
                ))}
                {remaining > 0 ? <li>{`และอีก ${remaining} ห้อง`}</li> : null}
            </ul>
            <p className="pl-5">
                {canEditPlannedCounts ? (
                    <Link
                        href={SCHOOL_CLASSES_PATH}
                        className="font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    >
                        แก้ไขจำนวนนักเรียน
                    </Link>
                ) : (
                    "แจ้งผู้ดูแลโรงเรียนเพื่อแก้ไขจำนวนนักเรียน"
                )}
            </p>
        </div>
    );
}

export function MissingPlannedCountNotice(): React.ReactNode {
    return (
        <p className="mt-3 text-xs font-semibold text-slate-500" role="note">
            ยังไม่ได้กำหนดจำนวนนักเรียน จึงคำนวณความครอบคลุมไม่ได้
        </p>
    );
}

export function SystemCountMismatchNote({
    schoolsWithCountMismatch,
}: {
    schoolsWithCountMismatch: number;
}): React.ReactNode {
    if (schoolsWithCountMismatch <= 0) return null;

    return (
        <p className="text-sm text-slate-500" role="note">
            {`${schoolsWithCountMismatch} โรงเรียนมีจำนวนนักเรียนที่ตั้งไว้น้อยกว่าที่คัดกรองจริง ความครอบคลุมนับไม่เกินจำนวนที่ตั้งไว้ของแต่ละห้อง`}
        </p>
    );
}
