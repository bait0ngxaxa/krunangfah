"use client";

import { Building2, LayoutGrid, Users, CheckCircle2 } from "lucide-react";
import type {
    SchoolClassItem,
    TeacherRosterItem,
} from "@/types/school-setup.types";

interface SetupSummaryProps {
    schoolName: string;
    province?: string;
    classes: SchoolClassItem[];
    roster: TeacherRosterItem[];
}

/**
 * Group classes by grade prefix (e.g. "ม.1/1" → "ม.1")
 */
function groupClassesByGrade(classes: SchoolClassItem[]) {
    const groups = new Map<string, SchoolClassItem[]>();

    for (const cls of classes) {
        const slashIdx = cls.name.indexOf("/");
        const prefix = slashIdx > 0 ? cls.name.slice(0, slashIdx) : cls.name;
        const group = groups.get(prefix) ?? [];
        group.push(cls);
        groups.set(prefix, group);
    }

    return Array.from(groups).sort(([a], [b]) => a.localeCompare(b, "th"));
}

const PROJECT_ROLE_LABELS: Record<string, string> = {
    lead: "ทีมนำ",
    care: "ทีมดูแล",
    coordinate: "ทีมประสาน",
};

const USER_ROLE_LABELS: Record<string, string> = {
    school_admin: "ครูนางฟ้า",
    class_teacher: "ครูประจำชั้น",
};

export function SetupSummary({
    schoolName,
    province,
    classes,
    roster,
}: SetupSummaryProps) {
    const groupedClasses = groupClassesByGrade(classes);

    return (
        <div className="space-y-5">
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                    <p className="font-bold text-green-700 text-sm">
                        ตั้งค่าเรียบร้อย!
                    </p>
                    <p className="text-xs text-green-600">
                        ตรวจสอบข้อมูลด้านล่าง แล้วกด &quot;เสร็จสิ้น&quot;
                    </p>
                </div>
            </div>

            {/* School info */}
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-medium">
                        โรงเรียน
                    </p>
                    <p className="font-bold text-gray-800">{schoolName}</p>
                    {province && (
                        <p className="text-sm text-gray-500">{province}</p>
                    )}
                </div>
            </div>

            {/* Classes summary */}
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
                    <LayoutGrid className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium">
                        ห้องเรียน ({classes.length} ห้อง)
                    </p>
                    {classes.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                            ยังไม่ได้เพิ่ม — สามารถเพิ่มภายหลังได้
                        </p>
                    ) : (
                        <div className="space-y-2 mt-1">
                            {groupedClasses.map(([grade, items]) => (
                                <div key={grade}>
                                    <span className="text-xs font-semibold text-emerald-600">
                                        {grade}
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                        {items.map((c) => (
                                            <span
                                                key={c.id}
                                                className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-teal-700 rounded-md text-xs font-medium"
                                            >
                                                {c.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Roster summary */}
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
                    <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium">
                        รายชื่อครู ({roster.length} คน)
                    </p>
                    {roster.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                            ยังไม่ได้เพิ่ม — สามารถเพิ่มภายหลังได้
                        </p>
                    ) : (
                        <div className="space-y-1 mt-1">
                            {roster.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center gap-2 text-sm flex-wrap"
                                >
                                    <span className="text-gray-700 font-medium">
                                        {t.firstName} {t.lastName}
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                                        {USER_ROLE_LABELS[t.userRole] ??
                                            t.userRole}
                                    </span>
                                    {t.userRole === "class_teacher" && (
                                        <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-medium">
                                            {t.advisoryClass}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {PROJECT_ROLE_LABELS[t.projectRole] ??
                                            t.projectRole}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
