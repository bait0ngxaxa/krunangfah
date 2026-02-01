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
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-pink-500/10 p-6 border-2 border-white relative overflow-hidden group hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
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
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-pink-500/10 p-6 border-2 border-white relative overflow-hidden group hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        🔍 ค้นหานักเรียน
                    </h3>
                    <StudentSearch />
                </div>
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
