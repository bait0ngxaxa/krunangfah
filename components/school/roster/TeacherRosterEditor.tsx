"use client";

import { UserPlus } from "lucide-react";
import { useTeacherRoster } from "./useTeacherRoster";
import { RosterForm, RosterList, RosterEmptyState } from "./components";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
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
        isDirty,
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
        deleteTarget,
        isRemoving,
        requestRemove,
        confirmRemove,
        cancelRemove,
    } = useTeacherRoster({ initialRoster, onUpdate });

    return (
        <div className="space-y-4">
            {/* Add teacher button / form toggle */}
            {!readOnly &&
                (!showForm ? (
                    <Button
                        type="button"
                        onClick={openAddForm}
                        variant="primary"
                        size="lg"
                        fullWidth
                    >
                        <UserPlus className="h-5 w-5" aria-hidden="true" />
                        เพิ่มครูในโรงเรียน
                    </Button>
                ) : (
                    <RosterForm
                        editingId={editingId}
                        isSubmitting={isSubmitting}
                        isDirty={isDirty}
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
                    onRemove={requestRemove}
                />
            )}

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                title="ลบครูออกจากรายชื่อ"
                message={`ต้องการลบครู "${deleteTarget?.name}" ออกจากรายชื่อใช่หรือไม่?`}
                confirmLabel="ยืนยันลบ"
                isLoading={isRemoving}
                onConfirm={confirmRemove}
                onCancel={cancelRemove}
            />
        </div>
    );
}
