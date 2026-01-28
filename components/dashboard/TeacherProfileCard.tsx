/**
 * Teacher Profile Card Component
 * แสดงข้อมูลส่วนตัวครู
 */

interface TeacherProfileCardProps {
    teacher: {
        firstName: string;
        lastName: string;
        age: number;
        advisoryClass: string;
        schoolRole: string;
        projectRole: string;
        school: {
            name: string;
        };
        academicYear: {
            year: number;
            semester: number;
        };
    };
    userRole: string;
}

const PROJECT_ROLE_LABELS: Record<string, string> = {
    lead: "ครูนางฟ้า (Lead)",
    care: "ครูนางฟ้า (Care)",
    coordinate: "ครูนางฟ้า (Coordinate)",
};

export function TeacherProfileCard({
    teacher,
    userRole,
}: TeacherProfileCardProps) {
    const isClassTeacher = userRole === "class_teacher";
    const projectRoleLabel =
        PROJECT_ROLE_LABELS[teacher.projectRole] || teacher.projectRole;

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-pink-100">
            <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span>👤</span> ข้อมูลส่วนตัว
                </h3>
                <span
                    className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        isClassTeacher
                            ? "bg-purple-100 text-purple-600 ring-2 ring-purple-200"
                            : "bg-pink-100 text-pink-600 ring-2 ring-pink-200"
                    }`}
                >
                    {isClassTeacher ? "ครูดูแลนักเรียน" : "ครูนางฟ้า"}
                </span>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-linear-to-br from-pink-300 to-purple-300 flex items-center justify-center text-white font-bold text-2xl shadow-inner border-4 border-white">
                        {teacher.firstName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-xl text-gray-800">
                            {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="text-sm font-medium text-pink-500">
                            {teacher.schoolRole}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-pink-50">
                    <div className="bg-pink-50/50 p-3 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">โรงเรียน</p>
                        <p className="text-sm font-bold text-gray-700">
                            {teacher.school.name}
                        </p>
                    </div>
                    <div className="bg-purple-50/50 p-3 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">ปีการศึกษา</p>
                        <p className="text-sm font-bold text-gray-700">
                            {teacher.academicYear.year} เทอม{" "}
                            {teacher.academicYear.semester}
                        </p>
                    </div>
                    {isClassTeacher && (
                        <div className="bg-blue-50/50 p-3 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">
                                ห้องที่ดูแล
                            </p>
                            <p className="text-sm font-bold text-gray-700">
                                {teacher.advisoryClass}
                            </p>
                        </div>
                    )}
                    <div className="bg-orange-50/50 p-3 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">
                            บทบาทในโครงการ
                        </p>
                        <p className="text-sm font-bold text-gray-700">
                            {projectRoleLabel}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
