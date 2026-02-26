"use client";

import { UserPlus } from "lucide-react";
import { useTeacherRoster } from "./useTeacherRoster";
import { RosterForm, RosterList, RosterEmptyState } from "./components";
import type { TeacherRosterEditorProps } from "./types";

export function TeacherRosterEditor({
    initialRoster,
    schoolClasses,
    onUpdate,
    readOnly = false,
}: TeacherRosterEditorProps) {
    const {
        roster,
        errorMsg,
        showForm,
        editingId,
        isSubmitting,
        userRoleValue,
        advisoryClassValue,
        register,
        errors,
        handleSubmit,
        setValue,
        openAddForm,
        startEdit,
        cancelForm,
        onSubmit,
        handleRemove,
    } = useTeacherRoster({ initialRoster, onUpdate });

    return (
        <div className="space-y-4">
            {/* Add teacher button / form toggle */}
            {!readOnly &&
                (!showForm ? (
                    <button
                        type="button"
                        onClick={openAddForm}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#0BD0D9]/50 text-[#09B8C0] rounded-xl font-bold text-sm hover:bg-cyan-50 hover:border-[#0BD0D9] transition-colors cursor-pointer"
                    >
                        <UserPlus className="w-4 h-4" />
                        เพิ่มครูในโรงเรียน
                    </button>
                ) : (
                    <RosterForm
                        editingId={editingId}
                        isSubmitting={isSubmitting}
                        userRoleValue={userRoleValue}
                        advisoryClassValue={advisoryClassValue}
                        schoolClasses={schoolClasses}
                        register={register}
                        errors={errors}
                        handleSubmit={handleSubmit}
                        setValue={setValue}
                        onSubmit={onSubmit}
                        onCancel={cancelForm}
                    />
                ))}

            {errorMsg && (
                <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
            )}

            {/* Teacher roster list */}
            {roster.length === 0 ? (
                <RosterEmptyState />
            ) : (
                <RosterList
                    roster={roster}
                    editingId={editingId}
                    readOnly={readOnly}
                    onEdit={startEdit}
                    onRemove={handleRemove}
                />
            )}
        </div>
    );
}
