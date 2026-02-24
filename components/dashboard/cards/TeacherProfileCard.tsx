import { School, CalendarDays, DoorOpen, Briefcase, User } from "lucide-react";
import {
    USER_ROLE_LABELS,
    PROJECT_ROLE_LABELS_EXT,
} from "@/lib/constants/roles";

interface TeacherProfileCardProps {
    teacher: {
        firstName: string;
        lastName: string;
        age: number;
        advisoryClass: string;
        schoolRole: string;
        projectRole: string;
        user: {
            school: {
                name: string;
            } | null;
        };
        academicYear: {
            year: number;
            semester: number;
        };
    };
    userRole: string;
}

export function TeacherProfileCard({
    teacher,
    userRole,
}: TeacherProfileCardProps) {
    const isClassTeacher = userRole === "class_teacher";
    const projectRoleLabel =
        PROJECT_ROLE_LABELS_EXT[teacher.projectRole] || teacher.projectRole;

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 overflow-hidden">
            {/* Gradient Header */}
            <div className="bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                        <User className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                        ข้อมูลส่วนตัว
                    </h3>
                </div>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                        isClassTeacher
                            ? "bg-purple-400/30 text-white ring-1 ring-white/20"
                            : "bg-white/25 text-white ring-1 ring-white/20"
                    }`}
                >
                    {isClassTeacher
                        ? USER_ROLE_LABELS["class_teacher"]
                        : USER_ROLE_LABELS["school_admin"]}
                </span>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5">
                {/* Profile Row */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200/50 ring-2 ring-white/80 shrink-0">
                        {teacher.firstName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-lg text-gray-800">
                            {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="text-sm font-medium text-emerald-500">
                            {teacher.schoolRole}
                        </p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoTile
                        icon={<School className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-400"
                        borderColor="border-emerald-100"
                        label="โรงเรียน"
                        value={teacher.user.school?.name || "ไม่ระบุ"}
                    />
                    <InfoTile
                        icon={<CalendarDays className="w-3.5 h-3.5" />}
                        iconColor="text-purple-400"
                        borderColor="border-purple-100"
                        label="ปีการศึกษา"
                        value={`${teacher.academicYear.year} เทอม ${teacher.academicYear.semester}`}
                    />
                    {isClassTeacher && (
                        <InfoTile
                            icon={<DoorOpen className="w-3.5 h-3.5" />}
                            iconColor="text-blue-400"
                            borderColor="border-blue-100"
                            label="ห้องที่ดูแล"
                            value={teacher.advisoryClass}
                        />
                    )}
                    <InfoTile
                        icon={<Briefcase className="w-3.5 h-3.5" />}
                        iconColor="text-orange-400"
                        borderColor="border-orange-100"
                        label="บทบาทในโครงการ"
                        value={projectRoleLabel}
                    />
                </div>
            </div>
        </div>
    );
}

function InfoTile({
    icon,
    iconColor,
    borderColor,
    label,
    value,
}: {
    icon: React.ReactNode;
    iconColor: string;
    borderColor: string;
    label: string;
    value: string;
}) {
    return (
        <div
            className={`bg-white/80 p-3 rounded-xl border ${borderColor} shadow-sm hover:shadow-md transition-all`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                <span className={iconColor}>{icon}</span>
                <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className="text-sm font-bold text-gray-700">{value}</p>
        </div>
    );
}
