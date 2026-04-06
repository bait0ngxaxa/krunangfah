"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Users, UserPlus, Info, CheckCircle2 } from "lucide-react";
import { ClassListEditor } from "@/components/school/classes";
import { TeacherRosterEditor } from "@/components/school/roster";
import { AddTeacherForm } from "@/components/teacher/forms/AddTeacherForm/AddTeacherForm";
import { TeacherInviteList } from "@/components/teacher/forms/AddTeacherForm/components";
import { buttonVariants } from "@/components/ui/Button";
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

type FlowSectionId = "classes" | "roster" | "invite";

const FLOW_SECTIONS: Array<{
    id: FlowSectionId;
    shortLabel: string;
    mobileLabel: string;
}> = [
    { id: "classes", shortLabel: "1 ห้องเรียน", mobileLabel: "1" },
    { id: "roster", shortLabel: "2 รายชื่อครู", mobileLabel: "2" },
    { id: "invite", shortLabel: "3 สร้างคำเชิญ", mobileLabel: "3" },
];

function StepBadge({
    step,
    title,
    countLabel,
}: {
    step: number;
    title: string;
    countLabel: string;
}): React.ReactNode {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-emerald-700">ขั้นตอน {step}</p>
            <p className="mt-1 text-sm font-bold text-gray-800">{title}</p>
            <p className="mt-1 text-xs text-gray-500">{countLabel}</p>
        </div>
    );
}

function SectionCard({
    id,
    icon,
    title,
    subtitle,
    children,
}: {
    id?: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}): React.ReactNode {
    return (
        <section
            id={id}
            className="scroll-mt-32 bg-white rounded-3xl shadow-sm p-6 sm:p-8 border-2 border-gray-100"
        >
                <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center shadow-sm text-white">
                    {icon}
                </div>
                <div>
                    <h2 className="text-base font-bold text-gray-800">{title}</h2>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

export function TeacherSetupTabs({
    classes,
    roster,
    academicYears,
    invites,
    isPrimary,
}: TeacherSetupTabsProps) {
    const [activeSection, setActiveSection] = useState<FlowSectionId>("classes");

    useEffect(() => {
        if (!isPrimary) return;

        const observers: IntersectionObserver[] = [];

        for (const section of FLOW_SECTIONS) {
            const element = document.getElementById(section.id);
            if (!element) continue;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveSection(section.id);
                    }
                },
                {
                    threshold: 0.35,
                    rootMargin: "-15% 0px -55% 0px",
                },
            );

            observer.observe(element);
            observers.push(observer);
        }

        return () => {
            for (const observer of observers) {
                observer.disconnect();
            }
        };
    }, [isPrimary]);

    const handleJumpToSection = (sectionId: FlowSectionId): void => {
        const element = document.getElementById(sectionId);
        if (!element) return;

        setActiveSection(sectionId);
        element.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    if (!isPrimary) {
        return (
            <div className="space-y-6">
                <SectionCard
                    id="invite"
                    icon={<UserPlus className="w-4 h-4" />}
                    title="สร้างลิงก์เชิญครู"
                    subtitle="เลือกครูจากข้อมูลที่มี แล้วส่งลิงก์ให้ครูตั้งรหัสผ่าน"
                >
                    <p className="text-gray-600 mb-6 sm:mb-8 bg-emerald-50/50 p-4 rounded-xl border border-gray-100 flex items-start gap-2 text-sm sm:text-base">
                        <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>
                            บัญชีของคุณมีสิทธิ์เฉพาะการเชิญครู หากต้องแก้ข้อมูลห้องเรียนหรือรายชื่อครู
                            ให้ติดต่อผู้ดูแลหลักของโรงเรียน
                        </span>
                    </p>
                    <AddTeacherForm
                        academicYears={academicYears}
                        roster={roster}
                        invites={invites}
                    />
                </SectionCard>
                <TeacherInviteList invites={invites} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <nav className="sticky top-3 z-30 rounded-2xl border border-gray-100 bg-white/95 backdrop-blur px-2 py-2 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {FLOW_SECTIONS.map((section) => {
                        const isActive = activeSection === section.id;

                        return (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => handleJumpToSection(section.id)}
                                className={buttonVariants({
                                    variant: isActive ? "primary" : "secondary",
                                    size: "sm",
                                    className:
                                        "shrink-0 px-3 shadow-none hover:shadow-sm",
                                })}
                            >
                                <span className="sm:hidden">{section.mobileLabel}</span>
                                <span className="hidden sm:inline">
                                    {section.shortLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="rounded-3xl border border-gray-100 bg-emerald-50/60 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-sm font-semibold">ลำดับการทำงานที่แนะนำ</p>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StepBadge
                        step={1}
                        title="เตรียมห้องเรียน"
                        countLabel={`${classes.length} ห้อง`}
                    />
                    <StepBadge
                        step={2}
                        title="เตรียมรายชื่อครู"
                        countLabel={`${roster.length} คน`}
                    />
                    <StepBadge
                        step={3}
                        title="สร้างคำเชิญ"
                        countLabel={`${invites.length} รายการ`}
                    />
                </div>
            </div>

            <SectionCard
                id="classes"
                icon={<LayoutGrid className="w-4 h-4" />}
                title="ขั้นตอน 1: เพิ่ม-ลบ ห้องเรียน"
                subtitle="ใช้เป็นตัวเลือกเมื่อกำหนดห้องที่ปรึกษาของครู"
            >
                <ClassListEditor initialClasses={classes} readOnly={false} />
            </SectionCard>

            <SectionCard
                id="roster"
                icon={<Users className="w-4 h-4" />}
                title="ขั้นตอน 2: เพิ่ม-ลบ ครู"
                subtitle="บันทึกข้อมูลครูล่วงหน้าเพื่อใช้ตอนสร้างคำเชิญ"
            >
                <TeacherRosterEditor
                    initialRoster={roster}
                    schoolClasses={classes}
                    readOnly={false}
                />
            </SectionCard>

            <SectionCard
                id="invite"
                icon={<UserPlus className="w-4 h-4" />}
                title="ขั้นตอน 3: สร้างลิงก์เชิญครู"
                subtitle="เลือกครูจากรายการ แล้วส่งลิงก์ให้ครูตั้งรหัสผ่าน"
            >
                <p className="text-gray-600 mb-6 sm:mb-8 bg-emerald-50/50 p-4 rounded-xl border border-gray-100 flex items-start gap-2 text-sm sm:text-base">
                    <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>
                        เมื่อสร้างคำเชิญแล้ว ระบบจะแสดงรายการสถานะด้านล่างและคัดลอกลิงก์ได้ทันที
                    </span>
                </p>
                <AddTeacherForm
                    academicYears={academicYears}
                    roster={roster}
                    invites={invites}
                />
            </SectionCard>

            <TeacherInviteList invites={invites} />
        </div>
    );
}
