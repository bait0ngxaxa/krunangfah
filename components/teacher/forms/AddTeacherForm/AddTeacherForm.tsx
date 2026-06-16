"use client";

import { useMemo } from "react";
import { useAddTeacherForm } from "./useAddTeacherForm";
import type { TeacherRosterItem } from "./types";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AddTeacherFormProps {
    roster: TeacherRosterItem[];
    invites: TeacherInviteWithAcademicYear[];
}

/**
 * AddTeacherForm - Roster-based invite flow
 * Select a teacher from roster → auto-fill all fields → submit
 */
export function AddTeacherForm({
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
    } = useAddTeacherForm();

    const { register, handleSubmit, formState } = form;
    const hasValidationErrors = Object.keys(formState.errors).length > 0;

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

    const blockedEmailSet = useMemo(
        () => new Set(blockedInvites.map((inv) => inv.email.toLowerCase())),
        [blockedInvites],
    );
    const blockedNameSet = useMemo(
        () =>
            new Set(
                blockedInvites.map((inv) => `${inv.firstName} ${inv.lastName}`),
            ),
        [blockedInvites],
    );
    const availableRoster = useMemo(
        () =>
            roster.filter((t) => {
                if (!t.email) return false;

                const emailKey = t.email.toLowerCase();
                const nameKey = `${t.firstName} ${t.lastName}`;

                return (
                    !blockedEmailSet.has(emailKey) &&
                    !blockedNameSet.has(nameKey)
                );
            }),
        [blockedEmailSet, blockedNameSet, roster],
    );
    const selectedTeacher = roster.find((t) => t.id === selectedRosterId);
    const blockedCount = blockedInvites.length;
    const missingEmailCount = roster.filter((t) => !t.email).length;
    const emptyRosterTitle =
        roster.length === 0
            ? "ยังไม่มีรายชื่อครู"
            : "ยังไม่มีครูที่พร้อมเชิญ";
    const emptyRosterDescription =
        roster.length === 0
            ? "เพิ่มครูในขั้นตอนที่ 2 ก่อน แล้วกลับมาเลือกครูเพื่อสร้างลิงก์เชิญ"
            : missingEmailCount > 0
              ? "ครูบางคนยังไม่มีอีเมล กรุณาแก้ไขข้อมูลครูก่อนส่งคำเชิญ"
              : "ครูทุกคนมีคำเชิญค้างอยู่หรือเปิดใช้งานแล้ว";

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            aria-busy={isLoading}
        >
            <ErrorMessage error={error} />
            {hasValidationErrors ? (
                <div
                    className="sr-only"
                    role="alert"
                    aria-live="assertive"
                >
                    {Object.values(formState.errors)
                        .map((fieldError) => fieldError?.message)
                        .filter(Boolean)
                        .join(" ")}
                </div>
            ) : null}

            <InviteLinkSection
                success={success}
                inviteLink={inviteLink}
                onCopy={copyToClipboard}
            />

            {/* Roster Picker */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-800">
                เลือกครูจากรายการที่พร้อมเชิญ
                {blockedCount > 0
                    ? ` (ซ่อนครู ${blockedCount} คนที่มีคำเชิญค้างหรือเปิดใช้งานแล้ว)`
                    : ""}
                {missingEmailCount > 0
                    ? ` กรุณาแก้ไขอีเมลในรายชื่อครู ${missingEmailCount} คนก่อนเชิญ`
                    : ""}
            </div>
            {availableRoster.length > 0 ? (
                <div>
                    <label
                        htmlFor="teacher-roster-invite-select"
                        className="block text-sm font-bold text-gray-700 mb-2"
                    >
                        <Users
                            className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-emerald-500"
                            aria-hidden="true"
                        />
                        เลือกครูที่จะส่งคำเชิญ
                    </label>
                    <select
                        id="teacher-roster-invite-select"
                        value={selectedRosterId}
                        disabled={isLoading}
                        aria-invalid={hasValidationErrors}
                        onChange={(e) => onSelectRoster(e.target.value, roster)}
                        className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 outline-none bg-white transition-base hover:border-emerald-300 text-black disabled:cursor-wait disabled:opacity-70"
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
                    <Users
                        className="w-8 h-8 text-gray-300 mx-auto mb-2"
                        aria-hidden="true"
                    />
                    <p className="text-sm text-gray-500 font-medium">
                        {emptyRosterTitle}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {emptyRosterDescription}
                    </p>
                </div>
            )}

            {/* Selected Teacher Info Display */}
            {selectedTeacher && (
                <div className="p-4 bg-white border border-emerald-100 rounded-xl space-y-3">
                    <p className="text-sm font-semibold text-emerald-800">
                        ตรวจสอบข้อมูลครูก่อนสร้างคำเชิญ
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheck
                            className="w-4 h-4 text-green-500"
                            aria-hidden="true"
                        />
                        <span className="text-sm font-bold text-gray-700">
                            ข้อมูลครูที่เลือก
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-1.5">
                            <User
                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <span className="text-xs text-gray-400">
                                    ชื่อ-นามสกุล
                                </span>
                                <p className="break-words font-semibold text-gray-800">
                                    {selectedTeacher.firstName}{" "}
                                    {selectedTeacher.lastName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <Clock
                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <span className="text-xs text-gray-400">
                                    อายุ
                                </span>
                                <p className="font-semibold text-gray-800">
                                    {selectedTeacher.age} ปี
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <Briefcase
                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <span className="text-xs text-gray-400">
                                    ประเภทครู
                                </span>
                                <p className="break-words font-semibold text-gray-800">
                                    {USER_ROLE_LABELS[
                                        selectedTeacher.userRole
                                    ] ?? selectedTeacher.userRole}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <GraduationCap
                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <span className="text-xs text-gray-400">
                                    {selectedTeacher.userRole ===
                                    "class_teacher"
                                        ? "ห้องที่ปรึกษา"
                                        : "สิทธิ์"}
                                </span>
                                <p className="break-words font-semibold text-gray-800">
                                    {selectedTeacher.advisoryClass}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <Building2
                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <span className="text-xs text-gray-400">
                                    บทบาทในโรงเรียน
                                </span>
                                <p className="break-words font-semibold text-gray-800">
                                    {selectedTeacher.schoolRole}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <FolderKanban
                                className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0">
                                <span className="text-xs text-gray-400">
                                    บทบาทในโครงการ
                                </span>
                                <p className="break-words font-semibold text-gray-800">
                                    {PROJECT_ROLE_LABELS[
                                        selectedTeacher.projectRole
                                    ] ?? selectedTeacher.projectRole}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5 text-sm text-gray-500">
                        <Mail
                            className="w-3.5 h-3.5 shrink-0 text-emerald-400"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 break-all">
                            {selectedTeacher.email}
                        </span>
                    </div>
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
            <input type="hidden" {...register("email")} />

            {/* Submit / Cancel */}
            {selectedTeacher && (
                <div className="flex gap-4 pt-4 border-t border-emerald-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        variant="primary"
                        size="lg"
                        className="flex-1"
                    >
                        {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                <span
                                    className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"
                                    aria-hidden="true"
                                />
                                กำลังสร้างคำเชิญ…
                            </span>
                        ) : (
                            "สร้างลิงค์คำเชิญ"
                        )}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCancel}
                        disabled={isLoading}
                        variant="secondary"
                        size="lg"
                    >
                        ยกเลิก
                    </Button>
                </div>
            )}
        </form>
    );
}
