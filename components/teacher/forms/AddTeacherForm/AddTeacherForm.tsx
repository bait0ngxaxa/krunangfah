"use client";

import { useAddTeacherForm } from "./useAddTeacherForm";
import type { AcademicYear, SchoolClassItem, TeacherRosterItem } from "./types";
import { ErrorMessage, InviteLinkSection } from "./components";
import { Users, UserCheck, Briefcase, GraduationCap, Mail } from "lucide-react";

interface AddTeacherFormProps {
    academicYears: AcademicYear[];
    schoolClasses: SchoolClassItem[];
    roster: TeacherRosterItem[];
}

const USER_ROLE_LABELS: Record<string, string> = {
    school_admin: "ครูนางฟ้า",
    class_teacher: "ครูประจำชั้น",
};

const PROJECT_ROLE_LABELS: Record<string, string> = {
    lead: "ทีมนำ",
    care: "ทีมดูแล",
    coordinate: "ทีมประสาน",
};

/**
 * AddTeacherForm - Roster-based invite flow
 * Select a teacher from roster → auto-fill all fields → only pick academic year → submit
 */
export function AddTeacherForm({
    academicYears,
    schoolClasses,
    roster,
}: AddTeacherFormProps): React.ReactNode {
    const {
        form,
        isLoading,
        error,
        success,
        inviteLink,
        selectedRosterId,
        onSelectRoster,
        onSubmit,
        copyToClipboard,
        handleCancel,
    } = useAddTeacherForm(academicYears);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    // Filter out already-invited teachers
    const availableRoster = roster.filter((t) => !t.inviteSent);
    const selectedTeacher = roster.find((t) => t.id === selectedRosterId);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <ErrorMessage error={error} />

            <InviteLinkSection
                success={success}
                inviteLink={inviteLink}
                onCopy={copyToClipboard}
            />

            {/* Roster Picker */}
            {availableRoster.length > 0 ? (
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-pink-500" />
                        เลือกครูจาก Roster
                    </label>
                    <select
                        value={selectedRosterId}
                        onChange={(e) => onSelectRoster(e.target.value, roster)}
                        className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none bg-white transition-all hover:border-pink-300 text-black"
                    >
                        <option value="">— เลือกครู —</option>
                        {availableRoster.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName} —{" "}
                                {USER_ROLE_LABELS[t.userRole] ?? t.userRole}
                                {t.userRole === "class_teacher"
                                    ? ` (${t.advisoryClass})`
                                    : ""}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className="text-center py-6 bg-pink-50/50 rounded-xl border border-pink-100">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">
                        ยังไม่มีครูใน Roster
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        ไปเพิ่มที่{" "}
                        <a
                            href="/school/classes"
                            className="text-pink-500 underline hover:text-pink-600"
                        >
                            จัดการห้องเรียนและครู
                        </a>{" "}
                        ก่อน
                    </p>
                </div>
            )}

            {/* Selected Teacher Info Display */}
            {selectedTeacher && (
                <div className="p-4 bg-white border border-pink-100 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold text-gray-700">
                            ข้อมูลครูที่เลือก
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-xs text-gray-400">
                                ชื่อ-นามสกุล
                            </span>
                            <p className="font-semibold text-gray-800">
                                {selectedTeacher.firstName}{" "}
                                {selectedTeacher.lastName}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">อายุ</span>
                            <p className="font-semibold text-gray-800">
                                {selectedTeacher.age} ปี
                            </p>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs text-gray-400">
                                    ประเภทครู
                                </span>
                                <p className="font-semibold text-gray-800">
                                    {USER_ROLE_LABELS[
                                        selectedTeacher.userRole
                                    ] ?? selectedTeacher.userRole}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs text-gray-400">
                                    {selectedTeacher.userRole ===
                                    "class_teacher"
                                        ? "ห้องที่ปรึกษา"
                                        : "สิทธิ์"}
                                </span>
                                <p className="font-semibold text-gray-800">
                                    {selectedTeacher.advisoryClass}
                                </p>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">
                                บทบาทในโรงเรียน
                            </span>
                            <p className="font-semibold text-gray-800">
                                {selectedTeacher.schoolRole}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400">
                                บทบาทในโครงการ
                            </span>
                            <p className="font-semibold text-gray-800">
                                {PROJECT_ROLE_LABELS[
                                    selectedTeacher.projectRole
                                ] ?? selectedTeacher.projectRole}
                            </p>
                        </div>
                    </div>

                    {/* Email — required, show if missing from roster */}
                    {!selectedTeacher.email && (
                        <div className="pt-2 border-t border-pink-50">
                            <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                                <Mail className="w-3.5 h-3.5 text-pink-500" />
                                อีเมล <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register("email")}
                                type="email"
                                className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none transition-all text-black placeholder:text-gray-400 hover:border-pink-300"
                                placeholder="กรอกอีเมลสำหรับส่งคำเชิญ"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-500 font-medium">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                    )}

                    {selectedTeacher.email && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Mail className="w-3.5 h-3.5 text-pink-400" />
                            <span>{selectedTeacher.email}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Academic Year — only show when teacher is selected */}
            {selectedTeacher && (
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        ปีการศึกษา <span className="text-red-500">*</span>
                    </label>
                    <select
                        {...register("academicYearId")}
                        className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 outline-none bg-white transition-all hover:border-pink-300 text-black"
                    >
                        <option value="">เลือกปีการศึกษา</option>
                        {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                {year.year}/{year.semester}
                            </option>
                        ))}
                    </select>
                    {errors.academicYearId && (
                        <p className="mt-1 text-sm text-red-500 font-medium">
                            {errors.academicYearId.message}
                        </p>
                    )}
                </div>
            )}

            {/* Hidden fields — auto-filled from roster */}
            <input type="hidden" {...register("firstName")} />
            <input type="hidden" {...register("lastName")} />
            <input type="hidden" {...register("age")} />
            <input type="hidden" {...register("userRole")} />
            <input type="hidden" {...register("advisoryClass")} />
            <input type="hidden" {...register("schoolRole")} />
            <input type="hidden" {...register("projectRole")} />
            {selectedTeacher?.email && (
                <input type="hidden" {...register("email")} />
            )}

            <div className="pt-4 border-t border-pink-100">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 border border-pink-200 text-gray-600 rounded-xl hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 transition-all font-medium cursor-pointer"
                >
                    ยกเลิก
                </button>
            </div>
        </form>
    );
}
