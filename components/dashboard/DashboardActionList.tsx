import { ActionCard } from "@/components/dashboard/ActionCard";
import { StudentSearch } from "@/components/dashboard/StudentSearch";
import { type UserRole } from "@/types/auth.types";

interface DashboardActionListProps {
    userRole: UserRole;
    studentCount: number;
}

export function DashboardActionList({
    userRole,
    studentCount,
}: DashboardActionListProps) {
    return (
        <div className="space-y-6">
            {/* เพิ่มข้อมูลคุณครู - เฉพาะ school_admin */}
            {userRole === "school_admin" && (
                <ActionCard
                    title="เพิ่มข้อมูลคุณครู"
                    buttonText="เพิ่มคุณครูผู้ดูแลนักเรียน"
                    href="/teachers/add"
                    variant="primary"
                />
            )}

            {/* อัพสกิลสำหรับคุณครู - ทุก role */}
            <ActionCard
                title="อัพสกิลสำหรับคุณครู"
                buttonText="อัพสกิลสำหรับคุณครู"
                href="/teachers/skill"
                variant="primary"
            />

            {/* เพิ่มนักเรียน + PHQ-A */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border-2 border-pink-200 hover:border-pink-300 transition-colors">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                    📝 จัดการข้อมูลนักเรียน
                </h3>
                <ActionCard
                    title="เพิ่มนักเรียน + PHQ-A (Import Excel)"
                    buttonText="Import Excel"
                    href="/students/import"
                    variant="primary"
                />
            </div>

            {/* นักเรียนของฉัน - แสดงเมื่อมีนักเรียนแล้ว */}
            {studentCount > 0 && (
                <ActionCard
                    title="รายชื่อนักเรียนทั้งหมด"
                    buttonText={`ดูรายชื่อนักเรียน (${studentCount} คน)`}
                    href="/students"
                    variant="primary"
                />
            )}

            {/* ดูข้อมูลนักเรียนรายบุคคล */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-pink-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                    🔍 ค้นหานักเรียน
                </h3>
                <StudentSearch />
            </div>

            {/* ดูสรุปข้อมูล */}
            <ActionCard
                title="ดูสรุปข้อมูล"
                buttonText="ดู Dashboard (Analytics)"
                href="/analytics"
                variant="primary"
            />
        </div>
    );
}
