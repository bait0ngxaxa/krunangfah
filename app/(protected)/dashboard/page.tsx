import { Suspense } from "react";

import { requireAuth } from "@/lib/session";
import {
    Users,
    School,
    Sparkles,
    DoorOpen,
    Briefcase,
    CalendarDays,
} from "lucide-react";
import { getDashboardData } from "@/lib/actions/dashboard.actions";
import { getCurrentAcademicYearRecord } from "@/lib/actions/academic-year.actions";
import {
    USER_ROLE_LABELS,
    PROJECT_ROLE_LABELS_EXT,
} from "@/lib/constants/roles";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActionCard } from "@/components/dashboard/cards/ActionCard";
import { DashboardActionList } from "@/components/dashboard/DashboardActionList";
import { DashboardContentSkeleton } from "@/components/dashboard/DashboardContentSkeleton";
import { PageBanner } from "@/components/ui/PageBanner";
import type { StatItem } from "@/components/dashboard/DashboardHeader";

import type { Metadata } from "next";
import type { Session } from "next-auth";

export const metadata: Metadata = {
    title: "หน้าหลัก | โครงการครูนางฟ้า",
    description: "หน้าหลักสำหรับครู",
};

function formatCount(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return "0";
    }

    return value.toLocaleString("th-TH");
}

function cleanDisplayText(value: string | null | undefined): string {
    const text = value?.trim();
    return text && text.length > 0 ? text : "ไม่ระบุ";
}

function getSchoolCount(
    dashboardData: Awaited<ReturnType<typeof getDashboardData>>,
): number | undefined {
    return "schoolCount" in dashboardData ? dashboardData.schoolCount : undefined;
}

function buildAdminStats(
    studentCount: number,
    schoolCount?: number,
): StatItem[] {
    const stats: StatItem[] = [
        {
            icon: Users,
            label: "นักเรียนคัดกรองทั้งหมด",
            value: formatCount(studentCount),
            unit: "คน",
            color: "pink",
        },
    ];
    if (schoolCount !== undefined) {
        stats.push({
            icon: School,
            label: "โรงเรียน",
            value: formatCount(schoolCount),
            unit: "โรงเรียน",
            color: "purple",
        });
    }
    return stats;
}

function buildTeacherStats(
    studentCount: number,
    advisoryClass: string,
    projectRole: string,
    isClassTeacher: boolean,
): StatItem[] {
    const extMap = new Map(Object.entries(PROJECT_ROLE_LABELS_EXT));
    const roleLabel = extMap.get(projectRole) ?? projectRole;
    const stats: StatItem[] = [
        {
            icon: Users,
            label: "จำนวนนักเรียนคัดกรอง",
            value: formatCount(studentCount),
            unit: "คน",
            color: "pink",
        },
    ];
    if (isClassTeacher) {
        stats.push({
            icon: DoorOpen,
            label: "ห้องที่ดูแล",
            value: cleanDisplayText(advisoryClass),
            color: "blue",
        });
    }
    stats.push({
        icon: Briefcase,
        label: "บทบาท",
        value: cleanDisplayText(roleLabel),
        color: "orange",
    });
    return stats;
}

export default async function DashboardPage() {
    const session = await requireAuth();

    return (
        <DashboardShell>
            <Suspense fallback={<DashboardContentSkeleton />}>
                <DashboardContent session={session} />
            </Suspense>
        </DashboardShell>
    );
}

async function DashboardContent({ session }: { session: Session }) {
    const dashboardData = await getDashboardData();

    const { teacher, studentCount } = dashboardData;
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";
    const schoolCount = getSchoolCount(dashboardData);

    if (isSystemAdmin) {
        return (
            <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                <DashboardHeader
                    teacherName={cleanDisplayText(
                        session.user.name || "System Admin",
                    )}
                    schoolName="ผู้ดูแลระบบ (ทุกโรงเรียน)"
                    subtitle="ผู้ดูแลระบบ"
                    variant="system_admin"
                    stats={buildAdminStats(studentCount, schoolCount)}
                />
                <DashboardActionList
                    userRole={userRole}
                    studentCount={studentCount}
                    isPrimary={session.user.isPrimary}
                />
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-6">
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center p-3 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg ring-1 ring-white/60 mb-5">
                        <Sparkles className="w-8 h-8 text-pink-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
                        ยินดีต้อนรับสู่โครงการครูนางฟ้า
                    </h1>
                    <p className="text-base text-gray-500 mb-8">
                        กรุณากรอกข้อมูลครูเพื่อเริ่มใช้งานระบบ
                    </p>
                    <ActionCard
                        title="เพิ่มข้อมูลครู"
                        description="กรอกข้อมูลส่วนตัวและบทบาทในโครงการ"
                        buttonText="กรอกข้อมูลครู"
                        href="/teacher-profile"
                        variant="primary"
                    />
                </div>
            </div>
        );
    }

    const isClassTeacher = userRole === "class_teacher";
    const currentAcademicYear = await getCurrentAcademicYearRecord();
    const teacherName = cleanDisplayText(
        `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`,
    );
    const schoolName = cleanDisplayText(teacher.user?.school?.name);
    const academicYearText = currentAcademicYear
        ? `${currentAcademicYear.year} เทอม ${currentAcademicYear.semester}`
        : "ไม่ระบุ";

    return (
        <>
            <PageBanner
                title="ระบบดูแลช่วยเหลือนักเรียน"
                subtitle={
                    <>
                        เพื่อการดูแลสุขภาพจิตนักเรียน
                        <br />
                        Angel Teacher Creative Assets
                    </>
                }
                imageSrc="/image/dashboard/main.webp"
                imageAlt="หน้าหลักระบบดูแลช่วยเหลือนักเรียน"
                imageContainerClassName="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] sm:w-[560px] lg:w-[680px] pointer-events-none z-10 flex items-end"
                showBackButton={false}
                actionNode={
                    <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-400 px-4 py-2 text-sm font-bold text-white shadow-md">
                        <CalendarDays className="h-5 w-5 shrink-0" />
                        <span className="min-w-0 break-words">
                            ปี {academicYearText}
                        </span>
                    </div>
                }
            />
            <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                <DashboardHeader
                    teacherName={teacherName}
                    schoolName={schoolName}
                    subtitle={
                        isClassTeacher
                            ? USER_ROLE_LABELS["class_teacher"]
                            : USER_ROLE_LABELS["school_admin"]
                    }
                    stats={buildTeacherStats(
                        studentCount,
                        teacher.advisoryClass,
                        teacher.projectRole,
                        isClassTeacher,
                    )}
                />
                <DashboardActionList
                    userRole={userRole}
                    studentCount={studentCount}
                    isPrimary={session.user.isPrimary}
                />
            </div>
        </>
    );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen">{children}</div>;
}
