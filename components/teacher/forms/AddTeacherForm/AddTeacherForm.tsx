"use client";

import { useMemo } from "react";
import { useAddTeacherForm } from "./useAddTeacherForm";
import type { AcademicYear, TeacherRosterItem } from "./types";
import type { TeacherInviteWithAcademicYear } from "@/lib/actions/teacher-invite";
import { USER_ROLE_LABELS, PROJECT_ROLE_LABELS } from "@/lib/constants/roles";
import { ErrorMessage, InviteLinkSection } from "./components";
import {
    Users,
    UserCheck,
    Briefcase,
    GraduationCap,
    Mail,
    User,
    Clock,
    Building2,
    FolderKanban,
    CalendarDays,
} from "lucide-react";

interface AddTeacherFormProps {
    academicYears: AcademicYear[];
    roster: TeacherRosterItem[];
    invites: TeacherInviteWithAcademicYear[];
}

/**
 * AddTeacherForm - Roster-based invite flow
 * Select a teacher from roster → auto-fill all fields → only pick academic year → submit
 */
export function AddTeacherForm({
    academicYears,
    roster,
    invites,
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

    // Filter out teachers who have an active (pending) invite or already accepted
    // Only allow re-inviting if invite is expired AND not accepted
    const blockedInvites = useMemo(() => {
        const now = new Date();
        return invites.filter(
            (inv) =>
                // Already accepted — never re-invite
                inv.acceptedAt !== null ||
                // Still pending (not expired) — don't re-invite yet
                new Date(inv.expiresAt) >= now,
        );
    }, [invites]);

    const availableRoster = roster.filter((t) => {
        const isBlocked = blockedInvites.some(
            (inv) =>
                (t.email && inv.email === t.email) ||
                (inv.firstName === t.firstName && inv.lastName === t.lastName),
        );
        return !isBlocked;
    });
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
                        <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-emerald-500" />
                        เลือกครูที่จะส่งคำเชิญ
                    </label>
                    <select
                        value={selectedRosterId}
                        onChange={(e) => onSelectRoster(e.target.value, roster)}
                        className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none bg-white transition-all hover:border-emerald-300 text-black"
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
                <div className="text-center py-6 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">
                        ยังไม่มีครูและชั้นเรียน โปรดเพิ่มก่อน
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        ไปเพิ่มที่{" "}
                        <a
                            href="/school/classes"
                            className="text-emerald-500 underline hover:text-emerald-600"
                        >
                            จัดการห้องเรียนและครู
                        </a>{" "}
                        ก่อน
                    </p>
                </div>
            )}

            {/* Selected Teacher Info Display */}
            {selectedTeacher && (
                <div className="p-4 bg-white border border-emerald-100 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold text-gray-700">
                            ข้อมูลครูที่เลือก
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs text-gray-400">
                                    ชื่อ-นามสกุล
                                </span>
                                <p className="font-semibold text-gray-800">
                                    {selectedTeacher.firstName}{" "}
                                    {selectedTeacher.lastName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs text-gray-400">
                                    อายุ
                                </span>
                                <p className="font-semibold text-gray-800">
                                    {selectedTeacher.age} ปี
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
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
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
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
                        <div className="flex items-start gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs text-gray-400">
                                    บทบาทในโรงเรียน
                                </span>
                                <p className="font-semibold text-gray-800">
                                    {selectedTeacher.schoolRole}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <FolderKanban className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
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
                    </div>

                    {/* Email — required, show if missing from roster */}
                    {!selectedTeacher.email && (
                        <div className="pt-2 border-t border-emerald-50">
                            <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2">
                                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                                อีเมล <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register("email")}
                                type="email"
                                className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all text-black placeholder:text-gray-400 hover:border-emerald-300"
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
                            <Mail className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{selectedTeacher.email}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Academic Year — only show when teacher is selected */}
            {selectedTeacher && (
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        <CalendarDays className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-emerald-500" />
                        ปีการศึกษา <span className="text-red-500">*</span>
                    </label>
                    <select
                        {...register("academicYearId")}
                        className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none bg-white transition-all hover:border-emerald-300 text-black"
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

            {/* Submit / Cancel */}
            {selectedTeacher && (
                <div className="flex gap-4 pt-4 border-t border-emerald-100">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-[#0BD0D9] text-white font-bold rounded-xl hover:bg-[#09B8C0] disabled:opacity-50 transition-all duration-200 shadow-sm"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                กำลังสร้างคำเชิญ...
                            </span>
                        ) : (
                            "สร้างลิงค์คำเชิญ"
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-3 border border-emerald-200 text-gray-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all font-medium"
                    >
                        ยกเลิก
                    </button>
                </div>
            )}
        </form>
    );
}
