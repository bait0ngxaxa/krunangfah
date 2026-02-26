"use client";

import { useClassList } from "./useClassList";
import { SingleClassAdder, BulkClassAdder, ClassGroupList } from "./components";
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
                onRemove={handleRemove}
            />
        </div>
    );
}
