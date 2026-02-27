"use client";

import { UserCheck, Shield } from "lucide-react";
import { Tabs, type Tab } from "@/components/ui/Tabs";
import { PrimaryAdminManager } from "@/components/school/admin";
import { SchoolTeacherList } from "@/components/school/SchoolTeacherList";
import type { SchoolClassItem } from "@/types/school-setup.types";
import type { SchoolAdminItem } from "@/types/primary-admin.types";
import type { UserListItem } from "@/types/user-management.types";

interface SchoolClassesTabsProps {
    classes: SchoolClassItem[];
    schoolAdmins: SchoolAdminItem[];
    registeredTeachers: UserListItem[];
    currentUserId: string;
}

export function SchoolClassesTabs({
    classes,
    schoolAdmins,
    registeredTeachers,
    currentUserId,
}: SchoolClassesTabsProps) {
    const tabs: Tab[] = [
        {
            id: "teachers",
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    ครูในระบบ
                </span>
            ),
            content: (
                <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[#0BD0D9] flex items-center justify-center shadow-sm">
                            <UserCheck className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">
                                ครูที่ลงทะเบียนแล้ว
                            </h2>
                            <p className="text-xs text-gray-400">
                                {registeredTeachers.length} คน —
                                แก้ไขห้องที่ปรึกษา / เปลี่ยนบทบาท
                            </p>
                        </div>
                    </div>
                    <SchoolTeacherList
                        teachers={registeredTeachers}
                        classes={classes}
                        currentUserId={currentUserId}
                    />
                </div>
            ),
        },
        {
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
        },
    ];

    return <Tabs tabs={tabs} defaultTab="teachers" />;
}
