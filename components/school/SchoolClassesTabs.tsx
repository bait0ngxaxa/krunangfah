"use client";

import type { ReactNode } from "react";
import {
    CheckCircle2,
    GraduationCap,
    Shield,
    ShieldCheck,
    UserCheck,
    UserCog,
} from "lucide-react";
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
    const teacherWithClassCount = registeredTeachers.filter(
        (teacher) => !!teacher.advisoryClass,
    ).length;
    const adminCount = schoolAdmins.length;
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
                <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[var(--brand-primary)] flex items-center justify-center shadow-sm">
                            <UserCheck
                                className="w-4 h-4 text-[var(--brand-primary)]"
                                aria-hidden="true"
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-gray-800">
                                ครูที่ลงทะเบียนแล้ว
                            </h2>
                            <p className="text-xs leading-5 text-gray-600">
                                {registeredTeachers.length} คน,
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
                <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-amber-400 flex items-center justify-center shadow-sm">
                            <Shield
                                className="w-4 h-4 text-amber-500"
                                aria-hidden="true"
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-gray-800">
                                จัดการสิทธิ์ผู้ดูแล
                            </h2>
                            <p className="text-xs leading-5 text-gray-600">
                                เพิ่มหรือถอดสิทธิ์แอดมิน ให้ผู้ดูแลคนอื่น
                            </p>
                        </div>
                    </div>
                    <PrimaryAdminManager
                        initialAdmins={schoolAdmins}
                        currentUserId={currentUserId}
                        registeredTeacherCount={registeredTeachers.length}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <SchoolUserOnboardingPanel
                teacherCount={registeredTeachers.length}
                teacherWithClassCount={teacherWithClassCount}
                classCount={classes.length}
                adminCount={adminCount}
            />
            <Tabs tabs={tabs} defaultTab="teachers" />
        </div>
    );
}

function SchoolUserOnboardingPanel({
    teacherCount,
    teacherWithClassCount,
    classCount,
    adminCount,
}: {
    teacherCount: number;
    teacherWithClassCount: number;
    classCount: number;
    adminCount: number;
}): ReactNode {
    return (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-emerald-800">
                        <UserCog className="h-4 w-4" aria-hidden="true" />
                        <h2 className="text-sm font-bold">
                            อ่านสถานะครูก่อนจัดการบัญชี
                        </h2>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-950/75">
                        ใช้หน้านี้เพื่อตรวจว่าครูเข้าระบบแล้วหรือยัง
                        ห้องที่ปรึกษาถูกต้องไหม และควรให้ใครช่วยดูแลข้อมูลโรงเรียน
                    </p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
                    ครูในระบบ {teacherCount} คน
                </span>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
                <SchoolUserGuideStep
                    icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
                    title="ดูรายชื่อครู"
                    description="ครูที่รับคำเชิญและสร้างโปรไฟล์แล้วจะแสดงในแท็บครูในระบบ"
                />
                <SchoolUserGuideStep
                    icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
                    title="ตรวจห้องที่ปรึกษา"
                    description={`${teacherWithClassCount} จาก ${teacherCount} คนมีห้องที่ปรึกษา, ห้องเรียนทั้งหมด ${classCount} ห้อง`}
                />
                <SchoolUserGuideStep
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    title="แก้เฉพาะที่จำเป็น"
                    description="แก้ห้องเมื่อข้อมูลผิด หรือลบครูที่ไม่ควรเข้าใช้งานระบบแล้ว"
                />
                <SchoolUserGuideStep
                    icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    title="จัดการสิทธิ์"
                    description={`มีครูนางฟ้า ${adminCount} คน ถ้าต้องแบ่งงานให้ใช้แท็บจัดการสิทธิ์`}
                />
            </div>
        </section>
    );
}

function SchoolUserGuideStep({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}): ReactNode {
    return (
        <div className="rounded-xl border border-emerald-100 bg-white p-3 text-emerald-900">
            <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    {icon}
                </span>
                <span className="text-sm font-bold">{title}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-950/70">
                {description}
            </p>
        </div>
    );
}
