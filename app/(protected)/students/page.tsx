import { Suspense } from "react";
import { FileUp, ClipboardList, Users } from "lucide-react";
import { getStudentDashboardData } from "@/lib/actions/student/dashboard";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { getReferredOutStudents } from "@/lib/actions/referral.actions";
import { requireAuth } from "@/lib/auth/session";
import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";
import { StudentDashboardSkeleton } from "@/components/student/dashboard/StudentDashboardSkeleton";
import { shouldShowStudentsImportEmptyState } from "@/components/student/dashboard/page-state";
import { PageBanner } from "@/components/ui/PageBanner";
import { buttonVariants } from "@/components/ui/Button";
import { isRiskLevel } from "@/lib/constants/risk-levels";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "นักเรียนทั้งหมด | โครงการครูนางฟ้า",
    description: "ข้อมูลนักเรียนและผลคัดกรอง PHQ-A",
};

interface StudentsPageProps {
    searchParams: Promise<{
        class?: string;
        page?: string;
        referred?: string;
        risk?: string;
        school?: string;
    }>;
}

interface NormalizedStudentFilters {
    class?: string;
    page: number;
    pageParam?: string;
    referred?: "true";
    risk?: string;
    school?: string;
}

function normalizeOptionalParam(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length > 100) {
        return undefined;
    }

    return trimmed;
}

function normalizePageParam(value: string | undefined): {
    page: number;
    pageParam?: string;
} {
    const page = Number(value);
    if (!Number.isSafeInteger(page) || page < 1) {
        return { page: 1 };
    }

    return page > 1 ? { page, pageParam: String(page) } : { page: 1 };
}

function normalizeStudentsFilters(filters: {
    class?: string;
    page?: string;
    referred?: string;
    risk?: string;
    school?: string;
}): NormalizedStudentFilters {
    const page = normalizePageParam(filters.page);
    const risk = isRiskLevel(filters.risk) ? filters.risk : undefined;

    return {
        class: normalizeOptionalParam(filters.class),
        page: page.page,
        pageParam: page.pageParam,
        referred: filters.referred === "true" ? "true" : undefined,
        risk,
        school: normalizeOptionalParam(filters.school),
    };
}

export default async function MyStudentsPage({
    searchParams,
}: StudentsPageProps) {
    const session = await requireAuth();
    const params = normalizeStudentsFilters(await searchParams);
    const userRole = session.user.role;
    const isAdmin = userRole === "system_admin";

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <PageBanner
                title="นักเรียนทั้งหมด"
                subtitle={
                    <>
                        ข้อมูลนักเรียนและ
                        <br />
                        ผลคัดกรอง PHQ-A
                    </>
                }
                icon={Users}
                imageSrc="/image/dashboard/students.webp"
                imageAlt="รายชื่อนักเรียนและผลคัดกรอง"
                actionNode={
                    !isAdmin ? (
                        <Link
                            href="/students/import"
                            className={buttonVariants({
                                variant: "secondary",
                                size: "md",
                                className:
                                    "relative z-30 rounded-2xl break-words",
                            })}
                        >
                            <FileUp className="h-4 w-4 shrink-0 stroke-3" />{" "}
                            <span className="min-w-0 break-words">
                                นำเข้าข้อมูล
                            </span>
                        </Link>
                    ) : null
                }
            />

            <div className="max-w-4xl mx-auto relative z-10 px-4 py-8">
                <Suspense fallback={<StudentDashboardSkeleton />}>
                    <StudentsContent
                        filters={params}
                        userRole={userRole}
                        isAdmin={isAdmin}
                    />
                </Suspense>
            </div>
        </div>
    );
}

async function StudentsContent({
    filters,
    userRole,
    isAdmin,
}: {
    filters: {
        class?: string;
        page: number;
        pageParam?: string;
        referred?: "true";
        risk?: string;
        school?: string;
    };
    userRole: string;
    isAdmin: boolean;
}) {
    const isClassTeacher = userRole === "class_teacher";
    const shouldLoadDashboardData = !isAdmin || Boolean(filters.school);
    const [dashboardResult, schools, referredOutStudents] = await Promise.all([
        shouldLoadDashboardData
            ? getStudentDashboardData({
                  schoolId: filters.school,
                  classFilter: filters.class,
                  page: filters.page,
                  riskFilter: filters.risk,
                  referredOnly: filters.referred === "true",
              })
            : Promise.resolve({ status: "forbidden" as const }),
        isAdmin ? getSchools() : Promise.resolve([]),
        isClassTeacher ? getReferredOutStudents() : Promise.resolve([]),
    ]);
    if (dashboardResult.status === "transient_error") {
        return <QueryErrorState requestId={dashboardResult.requestId} />;
    }
    if (
        dashboardResult.status === "forbidden" ||
        dashboardResult.status === "not_found"
    ) {
        return null;
    }
    const dashboardData = dashboardResult.data;
    const students = dashboardData.students;
    const shouldShowImportEmptyState = shouldShowStudentsImportEmptyState({
        classFilter: filters.class,
        hasClassOptions: dashboardData.classOptions.length > 0,
        isAdmin,
        page: filters.pageParam,
        referredFilter: filters.referred,
        riskFilter: filters.risk,
        totalStudents: dashboardData.totalStudents,
    });

    if (shouldShowImportEmptyState) {
        return (
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm md:p-12">
                <div className="relative py-8">
                    <div className="relative mx-auto mb-6 h-24 w-24">
                        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gray-100 shadow-sm ring-1 ring-gray-200/70">
                            <ClipboardList className="h-10 w-10 text-gray-400" />
                        </div>
                    </div>
                    <h2 className="mb-3 break-words text-2xl font-bold tracking-tight text-slate-800">
                        ยังไม่มีข้อมูลนักเรียน
                    </h2>
                    <p className="mx-auto mb-8 max-w-md break-words text-slate-500">
                        เริ่มต้นด้วยการนำเข้าข้อมูลนักเรียนจากไฟล์ Excel
                        เพื่อเริ่มติดตามและดูแลนักเรียนของคุณ
                    </p>
                    <Link
                        href="/students/import"
                        className={buttonVariants({
                            variant: "primary",
                            size: "lg",
                            className: "rounded-full",
                        })}
                    >
                        <FileUp className="h-5 w-5 shrink-0 stroke-[2.5]" />{" "}
                        <span className="min-w-0 break-words">
                            นำเข้าข้อมูลนักเรียน
                        </span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <StudentDashboard
            students={students}
            classes={dashboardData.classes}
            classOptions={dashboardData.classOptions}
            riskCounts={dashboardData.riskCounts}
            referredCount={dashboardData.referredCount}
            totalStudents={dashboardData.totalStudents}
            filteredStudentCount={dashboardData.filteredStudentCount}
            pagination={dashboardData.pagination}
            schools={isAdmin ? schools : undefined}
            userRole={userRole}
            referredOutStudents={
                isClassTeacher ? referredOutStudents : undefined
            }
            filters={{
                schoolId: filters.school,
                className: filters.class,
                page: filters.pageParam,
                riskLevel: filters.risk,
                referredOnly: filters.referred,
            }}
        />
    );
}
