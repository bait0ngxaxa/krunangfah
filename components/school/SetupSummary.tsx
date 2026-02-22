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
            <div className="flex items-center gap-3 p-4 bg-[#34D399]/10 border-2 border-[#34D399]/30 rounded-2xl shadow-sm relative overflow-hidden">
                <CheckCircle2 className="w-6 h-6 text-[#10B981] shrink-0 relative z-10" />
                <div className="relative z-10">
                    <p className="font-bold text-[#065F46] text-sm">
                        ตั้งค่าเรียบร้อย!
                    </p>
                    <p className="text-xs text-[#065F46]/80">
                        ตรวจสอบข้อมูลด้านล่าง แล้วกด &quot;เสร็จสิ้น&quot;
                    </p>
                </div>
            </div>

            {/* School info */}
            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-[#0BD0D9]/50">
                <div className="w-10 h-10 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-md border border-[#0BD0D9] shrink-0">
                    <Building2 className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-semibold mb-0.5">
                        โรงเรียน
                    </p>
                    <p className="font-extrabold text-slate-800 tracking-tight">
                        {schoolName}
                    </p>
                    {province && (
                        <p className="text-sm text-slate-500 font-medium">
                            {province}
                        </p>
                    )}
                </div>
            </div>

            {/* Classes summary */}
            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-[#0BD0D9]/50">
                <div className="w-10 h-10 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-md border border-[#0BD0D9] shrink-0">
                    <LayoutGrid className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-400 font-semibold mb-0.5">
                        ห้องเรียน ({classes.length} ห้อง)
                    </p>
                    {classes.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">
                            ยังไม่ได้เพิ่ม — สามารถเพิ่มภายหลังได้
                        </p>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {groupedClasses.map(([grade, items]) => (
                                <div key={grade}>
                                    <span className="text-xs font-bold text-emerald-600 block mb-1">
                                        {grade}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                                        {items.map((c) => (
                                            <span
                                                key={c.id}
                                                className="px-2.5 py-1 bg-gray-50 border-2 border-gray-100 text-gray-700 rounded-lg text-xs font-bold"
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
            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-[#0BD0D9]/50">
                <div className="w-10 h-10 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-md border border-[#0BD0D9] shrink-0">
                    <Users className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-400 font-semibold mb-0.5">
                        รายชื่อครู ({roster.length} คน)
                    </p>
                    {roster.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">
                            ยังไม่ได้เพิ่ม — สามารถเพิ่มภายหลังได้
                        </p>
                    ) : (
                        <div className="space-y-2 mt-2">
                            {roster.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center gap-2 text-sm flex-wrap p-2 bg-slate-50/50 rounded-xl border border-slate-100"
                                >
                                    <span className="text-slate-800 font-bold">
                                        {t.firstName} {t.lastName}
                                    </span>
                                    <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold ring-1 ring-blue-100">
                                        {USER_ROLE_LABELS[t.userRole] ??
                                            t.userRole}
                                    </span>
                                    {t.userRole === "class_teacher" && (
                                        <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-teal-700 rounded-md font-bold ring-1 ring-emerald-100">
                                            {t.advisoryClass}
                                        </span>
                                    )}
                                    <span className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md font-bold ring-1 ring-violet-100">
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
