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
    lead: "ทีมนำ (Lead)",
    care: "ทีมดูแล (Care)",
    coordinate: "ทีมประสานงาน (Coordinate)",
};

export function TeacherProfileCard({
    teacher,
    userRole,
}: TeacherProfileCardProps) {
    const isClassTeacher = userRole === "class_teacher";
    const projectRoleLabel =
        PROJECT_ROLE_LABELS[teacher.projectRole] || teacher.projectRole;

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-pink-500/10 p-6 border-2 border-white relative overflow-hidden group hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-300">
            {/* Gradient Border Overlay */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 via-purple-400 to-indigo-400" />

            <div className="flex items-start justify-between mb-6 relative z-10">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="p-2 bg-pink-50 rounded-lg shadow-sm">
                        👤
                    </span>{" "}
                    ข้อมูลส่วนตัว
                </h3>
                <span
                    className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-md ${
                        isClassTeacher
                            ? "bg-linear-to-r from-purple-50 to-purple-100 text-purple-700 ring-1 ring-purple-200"
                            : "bg-linear-to-r from-pink-50 to-pink-100 text-pink-700 ring-1 ring-pink-200"
                    }`}
                >
                    {isClassTeacher ? "ครูประจำชั้น" : "ครูนางฟ้า"}
                </span>
            </div>

            <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-linear-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-white">
                        {teacher.firstName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-xl bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="text-sm font-medium text-pink-500">
                            {teacher.schoolRole}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all">
                        <p className="text-xs text-gray-500 mb-1">โรงเรียน</p>
                        <p className="text-sm font-bold text-gray-700">
                            {teacher.school.name}
                        </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                        <p className="text-xs text-gray-500 mb-1">ปีการศึกษา</p>
                        <p className="text-sm font-bold text-gray-700">
                            {teacher.academicYear.year} เทอม{" "}
                            {teacher.academicYear.semester}
                        </p>
                    </div>
                    {isClassTeacher && (
                        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                            <p className="text-xs text-gray-500 mb-1">
                                ห้องที่ดูแล
                            </p>
                            <p className="text-sm font-bold text-gray-700">
                                {teacher.advisoryClass}
                            </p>
                        </div>
                    )}
                    <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
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
