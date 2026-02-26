"use client";

import { LayoutGrid, Users, Shield } from "lucide-react";
import { Tabs, type Tab } from "@/components/ui/Tabs";
import { ClassListEditor } from "@/components/school/classes";
import { TeacherRosterEditor } from "@/components/school/roster";
import { PrimaryAdminManager } from "@/components/school/admin";
import type { SchoolClassItem } from "@/types/school-setup.types";
import type { TeacherRosterItem } from "@/types/school-setup.types";
import type { SchoolAdminItem } from "@/types/primary-admin.types";

interface SchoolClassesTabsProps {
    classes: SchoolClassItem[];
    roster: TeacherRosterItem[];
    schoolAdmins: SchoolAdminItem[];
    isPrimary: boolean;
    currentUserId: string;
}

export function SchoolClassesTabs({
    classes,
    roster,
    schoolAdmins,
    isPrimary,
    currentUserId,
}: SchoolClassesTabsProps) {
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
                    รายชื่อครู
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
    ];

    // Add admin tab only for primary admins
    if (isPrimary) {
        tabs.push({
            id: "admin",
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    จัดการสิทธิ์
                </span>
            ),
            content: (
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shadow-sm">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">
                                จัดการสิทธิ์ผู้ดูแล
                            </h2>
                            <p className="text-xs text-gray-400">
                                เพิ่มหรือถอดสิทธิ์ Primary Admin
                                ให้ผู้ดูแลคนอื่น
                            </p>
                        </div>
                    </div>
                    <PrimaryAdminManager
                        initialAdmins={schoolAdmins}
                        currentUserId={currentUserId}
                    />
                </div>
            ),
        });
    }

    return <Tabs tabs={tabs} defaultTab="classes" />;
}
