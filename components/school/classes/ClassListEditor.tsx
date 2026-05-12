"use client";

import { useState } from "react";
import { useClassList } from "./useClassList";
import { SingleClassAdder, BulkClassAdder, ClassGroupList } from "./components";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ClassListEditorProps } from "./types";

export function ClassListEditor({
    initialClasses,
    onUpdate,
    readOnly = false,
}: ClassListEditorProps) {
    const {
        classes,
        inputValue,
        studentCountValue,
        errorMsg,
        bulkGrade,
        bulkCount,
        bulkStudentCount,
        setInputValue,
        setStudentCountValue,
        setBulkGrade,
        setBulkCount,
        setBulkStudentCount,
        handleAdd,
        handleRemove,
        handleUpdateStudentCount,
        handleBulkAdd,
    } = useClassList({ initialClasses, onUpdate });

    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleConfirmRemove() {
        if (!pendingDelete) return;
        setIsDeleting(true);
        await handleRemove(pendingDelete.id, pendingDelete.name);
        setIsDeleting(false);
        setPendingDelete(null);
    }

    return (
        <div className="space-y-5">
            {!readOnly && (
                <SingleClassAdder
                    inputValue={inputValue}
                    studentCountValue={studentCountValue}
                    onInputChange={setInputValue}
                    onStudentCountChange={setStudentCountValue}
                    onAdd={handleAdd}
                />
            )}

            {!readOnly && (
                <BulkClassAdder
                    bulkGrade={bulkGrade}
                    bulkCount={bulkCount}
                    bulkStudentCount={bulkStudentCount}
                    onGradeChange={setBulkGrade}
                    onCountChange={setBulkCount}
                    onStudentCountChange={setBulkStudentCount}
                    onBulkAdd={handleBulkAdd}
                />
            )}

            {errorMsg && (
                <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
            )}

            <ClassGroupList
                classes={classes}
                readOnly={readOnly}
                onRemove={(id, name) => setPendingDelete({ id, name })}
                onStudentCountChange={handleUpdateStudentCount}
            />

            <ConfirmDialog
                isOpen={!!pendingDelete}
                title="ลบห้องเรียน"
                message={`ต้องการลบห้อง "${pendingDelete?.name}" ใช่หรือไม่?`}
                confirmLabel="ยืนยันลบ"
                isLoading={isDeleting}
                onConfirm={handleConfirmRemove}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
