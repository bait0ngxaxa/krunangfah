"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LayoutGrid, Users, UserPlus, Info } from "lucide-react";
import { ClassListEditor } from "@/components/school/classes";
import { TeacherRosterEditor } from "@/components/school/roster";
import { AddTeacherForm } from "@/components/teacher/forms/AddTeacherForm/AddTeacherForm";
import { TeacherInviteList } from "@/components/teacher/forms/AddTeacherForm/components";
import { buttonVariants } from "@/components/ui/Button";
import {
    TeacherOnboardingGuide,
    type TeacherSetupSectionId,
} from "@/components/teacher/TeacherOnboardingGuide";
import type { AcademicYearOption } from "@/components/school/classes";
import type { SchoolClassItem } from "@/types/school-setup.types";
import type { TeacherRosterItem } from "@/types/school-setup.types";
import type { TeacherInviteWithAcademicYear } from "@/lib/actions/teacher-invite";

interface TeacherSetupTabsProps {
    classes: SchoolClassItem[];
    academicYears: AcademicYearOption[];
    roster: TeacherRosterItem[];
    invites: TeacherInviteWithAcademicYear[];
    isPrimary: boolean;
}

type FlowSectionId = TeacherSetupSectionId;

const FLOW_SECTIONS: Array<{
    id: FlowSectionId;
    shortLabel: string;
    mobileLabel: string;
}> = [
    { id: "classes", shortLabel: "1 ห้องเรียน", mobileLabel: "1" },
    { id: "roster", shortLabel: "2 เพิ่มครู", mobileLabel: "2" },
    { id: "invite", shortLabel: "3 เชิญครู", mobileLabel: "3" },
];

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
    children: ReactNode;
}): ReactNode {
    return (
        <section
            id={id}
            className="scroll-mt-32 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center shadow-sm text-white">
                    {icon}
                </div>
                <div>
                    <h2 className="text-base font-bold text-gray-800">
                        {title}
                    </h2>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

export function TeacherSetupTabs({
    classes,
    academicYears,
    roster,
    invites,
    isPrimary,
}: TeacherSetupTabsProps) {
    const [activeSection, setActiveSection] =
        useState<FlowSectionId>("classes");
    const [rosterDraft, setRosterDraft] = useState<{
        source: TeacherRosterItem[];
        value: TeacherRosterItem[];
    }>({ source: roster, value: roster });

    const handleRosterUpdate = (nextRoster: TeacherRosterItem[]): void => {
        setRosterDraft({ source: roster, value: nextRoster });
    };
    const rosterItems =
        rosterDraft.source === roster ? rosterDraft.value : roster;

    useEffect(() => {
        if (!isPrimary) return;
        if (!("IntersectionObserver" in window)) return;

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

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        setActiveSection(sectionId);
        element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
        });
    };

    if (!isPrimary) {
        return (
            <div className="space-y-6">
                <SectionCard
                    id="invite"
                    icon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
                    title="สร้างลิงก์เชิญครู"
                    subtitle="เลือกครูจากข้อมูลที่มี แล้วส่งลิงก์ให้ครูตั้งรหัสผ่าน"
                >
                    <p className="text-gray-600 mb-6 sm:mb-8 bg-emerald-50/50 p-4 rounded-xl border border-gray-100 flex items-start gap-2 text-sm sm:text-base">
                        <Info
                            className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            บัญชีของคุณมีสิทธิ์เฉพาะการเชิญครู
                            หากต้องแก้ข้อมูลห้องเรียนหรือรายชื่อครู
                            ให้ติดต่อผู้ดูแลหลักของโรงเรียน
                        </span>
                    </p>
                    <AddTeacherForm roster={rosterItems} invites={invites} />
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
                                <span className="sm:hidden">
                                    {section.mobileLabel}
                                </span>
                                <span className="hidden sm:inline">
                                    {section.shortLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <TeacherOnboardingGuide
                classCount={classes.length}
                rosterCount={rosterItems.length}
                inviteCount={invites.length}
                onSelect={handleJumpToSection}
            />

            <SectionCard
                id="classes"
                icon={<LayoutGrid className="w-4 h-4" aria-hidden="true" />}
                title="ขั้นตอน 1: เพิ่ม-ลบ ห้องเรียน"
                subtitle="ใช้เป็นตัวเลือกเมื่อกำหนดห้องที่ปรึกษาของครู"
            >
                <ClassListEditor
                    initialClasses={classes}
                    academicYears={academicYears}
                    readOnly={false}
                />
            </SectionCard>

            <SectionCard
                id="roster"
                icon={<Users className="w-4 h-4" aria-hidden="true" />}
                title="ขั้นตอน 2: เพิ่ม-ลบ ครู"
                subtitle="เตรียมข้อมูลครูก่อนสร้างลิงก์เชิญ"
            >
                <TeacherRosterEditor
                    initialRoster={rosterItems}
                    schoolClasses={classes}
                    onUpdate={handleRosterUpdate}
                    readOnly={false}
                />
            </SectionCard>

            <SectionCard
                id="invite"
                icon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
                title="ขั้นตอน 3: เชิญครูเข้าระบบ"
                subtitle="เลือกครูจากรายชื่อเพื่อสร้างลิงก์เชิญ"
            >
                <AddTeacherForm roster={rosterItems} invites={invites} />
            </SectionCard>

            <TeacherInviteList invites={invites} />
        </div>
    );
}
