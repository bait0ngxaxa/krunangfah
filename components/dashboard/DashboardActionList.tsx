import dynamic from "next/dynamic";
import { HeroCard } from "@/components/dashboard/cards/HeroCard";
import { QuickActionCard } from "@/components/dashboard/cards/QuickActionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { type UserRole } from "@/types/auth.types";
import {
    GraduationCap,
    FileSpreadsheet,
    Users,
    BarChart3,
    Search,
    UserPlus,
    Link as LinkIcon,
    Upload,
    UsersRound,
    ShieldCheck,
} from "lucide-react";

const StudentSearch = dynamic(
    () =>
        import("@/components/dashboard/student-search/StudentSearch").then(
            (mod) => ({ default: mod.StudentSearch }),
        ),
    {
        loading: () => (
            <div
                role="status"
                aria-label="กำลังโหลดช่องค้นหานักเรียน"
            >
                <Skeleton className="h-14 rounded-2xl" />
            </div>
        ),
    },
);

interface DashboardActionListProps {
    userRole: UserRole;
    studentCount: number;
    isPrimary?: boolean;
}

export function DashboardActionList({
    userRole,
    studentCount,
    isPrimary,
}: DashboardActionListProps) {
    const isSystemAdmin = userRole === "system_admin";
    const isSchoolAdmin = userRole === "school_admin";

    return (
        <div className="space-y-3">
            {(isSystemAdmin || isSchoolAdmin) && (
                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {isSystemAdmin && (
                        <QuickActionCard
                            href="/admin/system"
                            icon={ShieldCheck}
                            title="ศูนย์ดูแลระบบ"
                            description="ค้นหาและจัดการข้อมูลโรงเรียน ผู้ใช้ ครู หรือนักเรียน"
                        />
                    )}

                    {isSystemAdmin && (
                        <QuickActionCard
                            href="/admin/invites"
                            icon={LinkIcon}
                            title="จัดการลิงก์คำเชิญ"
                            description="สร้างและจัดการคำเชิญสำหรับแอดมินระบบและแอดมินโรงเรียน"
                        />
                    )}

                    {isSchoolAdmin && (
                        <QuickActionCard
                            href="/teachers/add"
                            icon={UserPlus}
                            title={
                                isPrimary
                                    ? "จัดการข้อมูลครู"
                                    : "เชิญครูเข้าระบบ"
                            }
                            description={
                                isPrimary
                                    ? "ตั้งค่าห้องเรียน เพิ่มรายชื่อครู และสร้างลิงก์เชิญ"
                                    : "เลือกครูจากรายชื่อเพื่อสร้างลิงก์เชิญ"
                            }
                        />
                    )}

                    {isSchoolAdmin && isPrimary && (
                        <QuickActionCard
                            href="/school/classes"
                            icon={UsersRound}
                            title="จัดการครูในระบบ"
                            description="แก้ไขห้องที่ปรึกษาและจัดการสิทธิ์ผู้ดูแล"
                        />
                    )}
                </div>
            )}

            {!isSystemAdmin && (
                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <QuickActionCard
                        href="/students/import"
                        icon={FileSpreadsheet}
                        title="นำเข้าข้อมูลนักเรียน"
                        description="อัปโหลดไฟล์ Excel พร้อมข้อมูลนักเรียนและผลคัดกรอง"
                        imageSrc="/image/dashboard/import.webp"
                        imageClassName="w-[85px] sm:w-[95px]"
                        actionButton={
                            <div className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-base hover:brightness-95 sm:text-xs">
                                <Upload
                                    className="h-3.5 w-3.5 shrink-0 stroke-[2.5]"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 break-words">
                                    นำเข้า Excel
                                </span>
                            </div>
                        }
                    />
                    <QuickActionCard
                        href="/teachers/skill"
                        icon={GraduationCap}
                        title="อัพสกิลคุณครู"
                        description="เรียนรู้และพัฒนาทักษะในการดูแลสุขภาพจิตนักเรียน"
                        imageSrc="/image/dashboard/teacherskills.png"
                    />
                </div>
            )}

            <HeroCard
                href="/students"
                icon={Users}
                title="ดูนักเรียนทั้งหมด"
                badge={
                    studentCount > 0
                        ? `${studentCount.toLocaleString()} คน`
                        : undefined
                }
                description="ดูรายชื่อและผลคัดกรอง"
                imageSrc="/image/dashboard/students.webp"
                theme="emerald"
                isEmpty={!isSystemAdmin && studentCount === 0}
                emptyTitle="ยังไม่มีข้อมูลนักเรียน"
                emptyDescription="นำเข้าข้อมูลนักเรียนเพื่อเริ่มใช้งานระบบคัดกรอง"
            />

            <HeroCard
                href="/analytics"
                icon={BarChart3}
                title="ดูสรุปผลคัดกรอง"
                description="ดูภาพรวมผลคัดกรอง PHQ-A และสถิติ"
                imageSrc="/image/dashboard/analytics.png"
                theme="teal"
            />

            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative flex items-center gap-2.5 bg-linear-to-r from-emerald-400 via-green-400 to-emerald-500 px-5 py-3">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
                    <div className="rounded-lg border border-emerald-200 bg-white p-1.5 shadow-inner ring-1 ring-white/20">
                        <Search className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="break-words text-sm font-bold tracking-wide text-white">
                        ค้นหานักเรียน
                    </h3>
                </div>
                <div className="p-4 sm:p-5">
                    <StudentSearch canSearchNationalId={isSystemAdmin} />
                </div>
            </div>
        </div>
    );
}
