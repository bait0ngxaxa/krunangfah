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
        errorMsg,
        bulkGrade,
        bulkCount,
        setInputValue,
        setBulkGrade,
        setBulkCount,
        handleAdd,
        handleRemove,
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
                    onInputChange={setInputValue}
                    onAdd={handleAdd}
                />
            )}

            {!readOnly && (
                <BulkClassAdder
                    bulkGrade={bulkGrade}
                    bulkCount={bulkCount}
                    onGradeChange={setBulkGrade}
                    onCountChange={setBulkCount}
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
