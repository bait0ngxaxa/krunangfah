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
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                    ข้อมูลส่วนตัว
                </h3>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isClassTeacher
                            ? "bg-purple-100 text-purple-700"
                            : "bg-pink-100 text-pink-700"
                    }`}
                >
                    {isClassTeacher ? "ครูดูแลนักเรียน" : "ครูนางฟ้า"}
                </span>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-lg">
                        {teacher.firstName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">
                            {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                            {teacher.schoolRole}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div>
                        <p className="text-xs text-gray-500">โรงเรียน</p>
                        <p className="text-sm font-medium text-gray-700">
                            {teacher.school.name}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">ปีการศึกษา</p>
                        <p className="text-sm font-medium text-gray-700">
                            {teacher.academicYear.year} เทอม{" "}
                            {teacher.academicYear.semester}
                        </p>
                    </div>
                    {isClassTeacher && (
                        <div>
                            <p className="text-xs text-gray-500">ห้องที่ดูแล</p>
                            <p className="text-sm font-medium text-gray-700">
                                {teacher.advisoryClass}
                            </p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-gray-500">บทบาทในโครงการ</p>
                        <p className="text-sm font-medium text-gray-700">
                            {projectRoleLabel}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
