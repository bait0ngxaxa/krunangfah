import { Suspense } from "react";
import { FileUp, ClipboardList, Users } from "lucide-react";
import { getStudentDashboardData } from "@/lib/actions/student/dashboard";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { getReferredOutStudents } from "@/lib/actions/referral.actions";
import { requireAuth } from "@/lib/session";
import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";
import { StudentDashboardSkeleton } from "@/components/student/dashboard/StudentDashboardSkeleton";
import { shouldShowStudentsImportEmptyState } from "@/components/student/dashboard/page-state";
import { PageBanner } from "@/components/ui/PageBanner";
import { buttonVariants } from "@/components/ui/Button";
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

export default async function MyStudentsPage({
    searchParams,
}: StudentsPageProps) {
    const session = await requireAuth();
    const params = await searchParams;
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
                actionNode={
                    !isAdmin ? (
                        <Link
                            href="/students/import"
                            className={buttonVariants({
                                variant: "secondary",
                                size: "md",
                                className: "relative z-30 rounded-2xl",
                            })}
                        >
                            <FileUp className="w-4 h-4 stroke-3" /> นำเข้าข้อมูล
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
        page?: string;
        referred?: string;
        risk?: string;
        school?: string;
    };
    userRole: string;
    isAdmin: boolean;
}) {
    const isClassTeacher = userRole === "class_teacher";
    const shouldLoadDashboardData = !isAdmin || Boolean(filters.school);
    const [dashboardData, schools, referredOutStudents] = await Promise.all([
        shouldLoadDashboardData
            ? getStudentDashboardData({
                  schoolId: filters.school,
                  classFilter: filters.class,
                  page: filters.page ? Number(filters.page) : 1,
                  riskFilter: filters.risk,
                  referredOnly: filters.referred === "true",
              })
            : Promise.resolve({
                  students: [],
                  classes: [],
                  classOptions: [],
                  riskCounts: {
                      red: 0,
                      orange: 0,
                      yellow: 0,
                      green: 0,
                      blue: 0,
                  },
                  referredCount: 0,
                  totalStudents: 0,
                  filteredStudentCount: 0,
                  pagination: {
                      page: 1,
                      limit: 24,
                      total: 0,
                      totalPages: 1,
                      hasNextPage: false,
                      hasPreviousPage: false,
                  },
              }),
        isAdmin ? getSchools() : Promise.resolve([]),
        isClassTeacher ? getReferredOutStudents() : Promise.resolve([]),
    ]);
    const students = dashboardData.students;
    const shouldShowImportEmptyState = shouldShowStudentsImportEmptyState({
        classFilter: filters.class,
        hasClassOptions: dashboardData.classOptions.length > 0,
        isAdmin,
        page: filters.page,
        referredFilter: filters.referred,
        riskFilter: filters.risk,
        totalStudents: dashboardData.totalStudents,
    });

    if (shouldShowImportEmptyState) {
        return (
            <div className="relative bg-white rounded-2xl shadow-sm p-6 md:p-12 border-2 border-gray-100 text-center overflow-hidden">
                <div className="relative py-8">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="relative w-full h-full rounded-full bg-gray-100 shadow-sm flex items-center justify-center ring-1 ring-gray-200/70">
                            <ClipboardList className="w-10 h-10 text-gray-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">
                        ยังไม่มีข้อมูลนักเรียน
                    </h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">
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
                        <FileUp className="w-5 h-5 stroke-[2.5]" />{" "}
                        นำเข้าข้อมูลนักเรียน
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
                page: filters.page,
                riskLevel: filters.risk,
                referredOnly: filters.referred,
            }}
        />
    );
}
