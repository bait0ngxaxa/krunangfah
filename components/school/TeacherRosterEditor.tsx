"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, UserPlus, Users, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
    addTeacherToRoster,
    removeFromRoster,
    updateRosterEntry,
} from "@/lib/actions/teacher-roster.actions";
import {
    teacherRosterSchema,
    ADMIN_ADVISORY_CLASS,
    type TeacherRosterFormData,
} from "@/lib/validations/teacher-roster.validation";
import type {
    TeacherRosterItem,
    SchoolClassItem,
} from "@/types/school-setup.types";
import {
    USER_ROLE_LABELS,
    USER_ROLE_OPTIONS,
    PROJECT_ROLE_LABELS,
    PROJECT_ROLE_OPTIONS,
} from "@/lib/constants/roles";

interface TeacherRosterEditorProps {
    initialRoster: TeacherRosterItem[];
    schoolClasses: SchoolClassItem[];
    onUpdate?: (roster: TeacherRosterItem[]) => void;
    readOnly?: boolean;
}

export function TeacherRosterEditor({
    initialRoster,
    schoolClasses,
    onUpdate,
    readOnly = false,
}: TeacherRosterEditorProps) {
    const [roster, setRoster] = useState<TeacherRosterItem[]>(initialRoster);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<TeacherRosterFormData>({
        resolver: zodResolver(teacherRosterSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            age: undefined as unknown as number,
            userRole: undefined,
            advisoryClass: "",
            schoolRole: "",
            projectRole: undefined,
        },
    });

    const userRoleValue = useWatch({ control, name: "userRole" }) ?? "";
    const advisoryClassValue =
        useWatch({ control, name: "advisoryClass" }) ?? "";

    // Auto-set advisory class for school_admin
    useEffect(() => {
        if (userRoleValue === "school_admin") {
            setValue("advisoryClass", ADMIN_ADVISORY_CLASS, {
                shouldValidate: true,
            });
        } else if (
            userRoleValue === "class_teacher" &&
            advisoryClassValue === ADMIN_ADVISORY_CLASS
        ) {
            setValue("advisoryClass", "", { shouldValidate: false });
        }
    }, [userRoleValue, setValue, advisoryClassValue]);

    function syncUpdate(updated: TeacherRosterItem[]) {
        setRoster(updated);
        onUpdate?.(updated);
    }

    function startEdit(teacher: TeacherRosterItem) {
        setEditingId(teacher.id);
        setShowForm(true);
        setErrorMsg(null);

        // Pre-fill form with existing data
        setValue("firstName", teacher.firstName);
        setValue("lastName", teacher.lastName);
        setValue("email", teacher.email || "");
        setValue("age", teacher.age);
        setValue(
            "userRole",
            teacher.userRole as "school_admin" | "class_teacher",
        );
        setValue("advisoryClass", teacher.advisoryClass);
        setValue("schoolRole", teacher.schoolRole);
        setValue(
            "projectRole",
            teacher.projectRole as "lead" | "care" | "coordinate",
        );
    }

    function cancelForm() {
        setShowForm(false);
        setEditingId(null);
        reset();
    }

    async function onSubmit(data: TeacherRosterFormData) {
        setErrorMsg(null);

        if (editingId) {
            // Update existing entry
            const result = await updateRosterEntry(editingId, data);
            if (!result.success) {
                setErrorMsg(result.message);
                toast.error(result.message || "อัพเดตข้อมูลไม่สำเร็จ");
                return;
            }
            if (result.data) {
                const updatedEntry = result.data;
                if (!updatedEntry) return;
                const updated = roster
                    .map((t) => (t.id === editingId ? updatedEntry : t))
                    .sort((a, b) =>
                        `${a.firstName} ${a.lastName}`.localeCompare(
                            `${b.firstName} ${b.lastName}`,
                            "th",
                        ),
                    );
                syncUpdate(updated);
                toast.success(
                    `อัพเดตข้อมูลครู "${updatedEntry.firstName} ${updatedEntry.lastName}" สำเร็จ`,
                );
            }
        } else {
            // Add new entry
            const result = await addTeacherToRoster(data);
            if (!result.success) {
                setErrorMsg(result.message);
                toast.error(result.message || "เพิ่มครูไม่สำเร็จ");
                return;
            }
            if (result.data) {
                const updated = [...roster, result.data].sort((a, b) =>
                    `${a.firstName} ${a.lastName}`.localeCompare(
                        `${b.firstName} ${b.lastName}`,
                        "th",
                    ),
                );
                syncUpdate(updated);
                toast.success(
                    `เพิ่มครู "${result.data.firstName} ${result.data.lastName}" สำเร็จ`,
                );
            }
        }

        reset();
        setShowForm(false);
        setEditingId(null);
    }

    async function handleRemove(id: string, name: string) {
        const confirmed = window.confirm(
            `ต้องการลบครู "${name}" ออกจากรายชื่อใช่หรือไม่?`,
        );
        if (!confirmed) return;

        setErrorMsg(null);
        const result = await removeFromRoster(id);
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "ลบครูไม่สำเร็จ");
            return;
        }
        startTransition(() => {
            syncUpdate(roster.filter((t) => t.id !== id));
        });
        toast.success(`ลบครู "${name}" สำเร็จ`);
    }

    // Shared form JSX (used for both add and edit)
    const formContent = (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 bg-white rounded-2xl border-2 border-[#0BD0D9]/50 shadow-sm space-y-4"
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-[#09B8C0] flex items-center gap-1.5">
                    {editingId ? (
                        <>
                            <Pencil className="w-4 h-4" />
                            แก้ไขข้อมูลครู
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" />
                            เพิ่มครู
                        </>
                    )}
                </span>
                <button
                    type="button"
                    onClick={cancelForm}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Row 1: Name + Age */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3">
                <div className="col-span-1 sm:col-span-2">
                    <input
                        {...register("firstName")}
                        placeholder="ชื่อ *"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.firstName && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.firstName.message}
                        </p>
                    )}
                </div>
                <div className="col-span-1 sm:col-span-2">
                    <input
                        {...register("lastName")}
                        placeholder="นามสกุล *"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.lastName && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.lastName.message}
                        </p>
                    )}
                </div>
                <div className="col-span-1 sm:col-span-1">
                    <input
                        {...register("age", { valueAsNumber: true })}
                        type="number"
                        placeholder="อายุ *"
                        min={18}
                        max={100}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.age && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.age.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Row 2: Email + User Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="อีเมล (ไม่บังคับ)"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 placeholder:text-gray-400 transition-colors"
                    />
                    {errors.email && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <div>
                    <select
                        {...register("userRole")}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#0BD0D9] bg-white shadow-sm text-gray-900 transition-colors truncate"
                    >
                        <option value="">ประเภทครู *</option>
                        {USER_ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                    {errors.userRole && (
                        <p className="mt-0.5 text-xs text-red-500">
                            {errors.userRole.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Row 3: Advisory Class (only for class_teacher) + School Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {userRoleValue === "class_teacher" ? (
                    <div>
                        <select
                            value={advisoryClassValue}
                            onChange={(e) =>
                                setValue("advisoryClass", e.target.value, {
                                    shouldValidate: true,
                                })
                            }
                            className="w-full px-4 py-2 border border-violet-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-violet-100/50 focus:border-violet-300 bg-white shadow-sm text-black transition-all truncate"
                        >
                            <option value="">เลือกห้องที่ปรึกษา *</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {errors.advisoryClass && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.advisoryClass.message}
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        <input
                            {...register("schoolRole")}
                            placeholder="บทบาทในโรงเรียน *"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-[#0BD0D9] bg-white text-gray-900 placeholder:text-gray-400"
                        />
                        {errors.schoolRole && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.schoolRole.message}
                            </p>
                        )}
                    </div>
                )}
                {userRoleValue === "class_teacher" ? (
                    <div>
                        <input
                            {...register("schoolRole")}
                            placeholder="บทบาทในโรงเรียน *"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-[#0BD0D9] bg-white text-gray-900 placeholder:text-gray-400"
                        />
                        {errors.schoolRole && (
                            <p className="mt-0.5 text-xs text-red-500">
                                {errors.schoolRole.message}
                            </p>
                        )}
                    </div>
                ) : (
                    <div /> /* spacer for school_admin */
                )}
            </div>

            {/* Row 4: Project Role (radio buttons) */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    บทบาทในโครงการครูนางฟ้า{" "}
                    <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border-2 border-gray-100 shadow-sm">
                    {PROJECT_ROLE_OPTIONS.map((role) => (
                        <label
                            key={role.value}
                            className="flex items-center gap-1.5 cursor-pointer group"
                        >
                            <div className="relative flex items-center">
                                <input
                                    {...register("projectRole")}
                                    type="radio"
                                    value={role.value}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-gray-300 shadow-sm transition-all checked:border-[#0BD0D9] checked:bg-[#0BD0D9] hover:border-[#0BD0D9]/50"
                                />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-white opacity-0 peer-checked:opacity-100">
                                    <Check className="h-2 w-2" />
                                </span>
                            </div>
                            <span className="text-sm text-gray-700 group-hover:text-[#09B8C0] transition-colors font-medium">
                                {role.label}
                            </span>
                        </label>
                    ))}
                </div>
                {errors.projectRole && (
                    <p className="mt-0.5 text-xs text-red-500">
                        {errors.projectRole.message}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                {editingId ? (
                    <>
                        <Check className="w-4 h-4" />
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4" />
                        {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มครู"}
                    </>
                )}
            </button>
        </form>
    );

    return (
        <div className="space-y-4">
            {/* Add teacher button / form toggle */}
            {!readOnly &&
                (!showForm ? (
                    <button
                        type="button"
                        onClick={() => {
                            setEditingId(null);
                            reset();
                            setShowForm(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#0BD0D9]/50 text-[#09B8C0] rounded-xl font-bold text-sm hover:bg-cyan-50 hover:border-[#0BD0D9] transition-colors cursor-pointer"
                    >
                        <UserPlus className="w-4 h-4" />
                        เพิ่มครูในโรงเรียน
                    </button>
                ) : (
                    formContent
                ))}

            {errorMsg && (
                <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
            )}

            {/* Teacher roster list */}
            {roster.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                        ยังไม่มีรายชื่อครู — เพิ่มด้านบนได้เลย
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                        ข้ามได้ — เพิ่มทีหลังจากหน้าจัดการ
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">
                        รายชื่อครูทั้งหมด ({roster.length} คน)
                    </p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {roster.map((t) => (
                            <div
                                key={t.id}
                                className={`flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border-2 transition-all group ${
                                    editingId === t.id
                                        ? "border-[#0BD0D9]"
                                        : "border-gray-100 hover:shadow-md hover:border-[#0BD0D9]/50"
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-gray-800">
                                            {t.firstName} {t.lastName}
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">
                                            {USER_ROLE_LABELS[t.userRole] ??
                                                t.userRole}
                                        </span>
                                        {t.userRole === "class_teacher" && (
                                            <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-teal-600 rounded-md font-medium">
                                                {t.advisoryClass}
                                            </span>
                                        )}
                                        <span className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded-md font-medium">
                                            {PROJECT_ROLE_LABELS[
                                                t.projectRole
                                            ] ?? t.projectRole}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-400">
                                            {t.schoolRole}
                                        </span>
                                        {t.email && (
                                            <span className="text-xs text-gray-400">
                                                • {t.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!readOnly && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(t)}
                                            className="text-gray-300 hover:text-blue-500 transition-all cursor-pointer p-1"
                                            title="แก้ไขข้อมูล"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemove(
                                                    t.id,
                                                    `${t.firstName} ${t.lastName}`,
                                                )
                                            }
                                            className="text-gray-300 hover:text-red-500 transition-all cursor-pointer p-1"
                                            title="ลบออกจาก roster"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
