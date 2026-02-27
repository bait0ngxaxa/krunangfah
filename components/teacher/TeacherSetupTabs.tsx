"use client";

import { LayoutGrid, Users, UserPlus, Info } from "lucide-react";
import { Tabs, type Tab } from "@/components/ui/Tabs";
import { ClassListEditor } from "@/components/school/classes";
import { TeacherRosterEditor } from "@/components/school/roster";
import { AddTeacherForm } from "@/components/teacher/forms/AddTeacherForm/AddTeacherForm";
import { TeacherInviteList } from "@/components/teacher/forms/AddTeacherForm/components";
import type { SchoolClassItem } from "@/types/school-setup.types";
import type { TeacherRosterItem } from "@/types/school-setup.types";
import type { AcademicYear } from "@/components/teacher/forms/AddTeacherForm/types";
import type { TeacherInviteWithAcademicYear } from "@/lib/actions/teacher-invite";

interface TeacherSetupTabsProps {
    classes: SchoolClassItem[];
    roster: TeacherRosterItem[];
    academicYears: AcademicYear[];
    invites: TeacherInviteWithAcademicYear[];
    isPrimary: boolean;
}

export function TeacherSetupTabs({
    classes,
    roster,
    academicYears,
    invites,
    isPrimary,
}: TeacherSetupTabsProps) {
    const tabs: Tab[] = [
        {
            id: "classes",
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4" />
                    ห้องเรียน
                </span>
            ),
            content: (
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-sm">
                            <LayoutGrid className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">
                                ห้องเรียน
                            </h2>
                            <p className="text-xs text-gray-400">
                                {classes.length} ห้อง — ใช้เป็นตัวเลือก
                                เมื่อเชิญครูประจำชั้น
                            </p>
                        </div>
                    </div>
                    <ClassListEditor
                        initialClasses={classes}
                        readOnly={!isPrimary}
                    />
                </div>
            ),
        },
        {
            id: "roster",
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    ครูในโรงเรียน
                </span>
            ),
            content: (
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-sm">
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">
                                รายชื่อครู
                            </h2>
                            <p className="text-xs text-gray-400">
                                {roster.length} คน —
                                ลงข้อมูลไว้ล่วงหน้าเพื่อใช้ตอน invite
                            </p>
                        </div>
                    </div>
                    <TeacherRosterEditor
                        initialRoster={roster}
                        schoolClasses={classes}
                        readOnly={!isPrimary}
                    />
                </div>
            ),
        },
        {
            id: "invite",
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    เชิญครู
                </span>
            ),
            content: (
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm p-5 sm:p-8 border-2 border-emerald-100">
                        <p className="text-gray-600 mb-6 sm:mb-8 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 flex items-start gap-2 text-sm sm:text-base">
                            <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>
                                เลือกครูจากข้อมูลคุณครูในโรงเรียน ระบบจะสร้าง
                                Link สำหรับให้ครูผู้ดูแลใช้ในการตั้งรหัสผ่าน
                            </span>
                        </p>
                        <AddTeacherForm
                            academicYears={academicYears}
                            roster={roster}
                            invites={invites}
                        />
                    </div>
                    <TeacherInviteList invites={invites} />
                </div>
            ),
        },
    ];

    return <Tabs tabs={tabs} defaultTab="invite" />;
}
