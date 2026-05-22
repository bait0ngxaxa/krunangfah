"use client";

import { useMemo, useState, useTransition } from "react";
import { useClassList } from "./useClassList";
import { SingleClassAdder, BulkClassAdder, ClassGroupList } from "./components";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getSchoolClasses } from "@/lib/actions/school-setup.actions";
import type { ClassListEditorProps } from "./types";

export function ClassListEditor({
    initialClasses,
    academicYears = [],
    lockAcademicYearSelection = false,
    onUpdate,
    readOnly = false,
}: ClassListEditorProps) {
    const defaultAcademicYearId =
        academicYears.find((year) => year.isCurrent)?.id ??
        academicYears[0]?.id;
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(
        defaultAcademicYearId ?? "",
    );
    const [termClasses, setTermClasses] = useState(initialClasses);
    const [isTermPending, startTermTransition] = useTransition();
    const selectedAcademicYear = useMemo(
        () =>
            academicYears.find((year) => year.id === selectedAcademicYearId) ??
            null,
        [academicYears, selectedAcademicYearId],
    );
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
    } = useClassList({
        initialClasses: termClasses,
        academicYearId: selectedAcademicYearId || undefined,
        onUpdate: (updatedClasses) => {
            setTermClasses(updatedClasses);
            onUpdate?.(updatedClasses);
        },
    });

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

    function handleAcademicYearChange(academicYearId: string): void {
        setSelectedAcademicYearId(academicYearId);
        startTermTransition(async () => {
            const nextClasses = await getSchoolClasses(academicYearId);
            setTermClasses(nextClasses);
            onUpdate?.(nextClasses);
        });
    }

    return (
        <div className="space-y-5">
            {academicYears.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <label
                        htmlFor="class-term"
                        className="mb-2 block text-sm font-bold text-gray-700"
                    >
                        จำนวนห้องสำหรับปี/เทอม
                    </label>
                    <select
                        id="class-term"
                        value={selectedAcademicYearId}
                        onChange={(event) =>
                            handleAcademicYearChange(event.target.value)
                        }
                        disabled={isTermPending || lockAcademicYearSelection}
                        className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                        {academicYears.map((year) => (
                            <option key={year.id} value={year.id}>
                                ปีการศึกษา {year.year} เทอม {year.semester}
                                {year.isCurrent ? " (ปัจจุบัน)" : ""}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                        การเพิ่ม/แก้จำนวนนักเรียนจะบันทึกกับ
                        {selectedAcademicYear
                            ? ` ปีการศึกษา ${selectedAcademicYear.year} เทอม ${selectedAcademicYear.semester}`
                            : " เทอมที่เลือก"}
                    </p>
                </div>
            )}

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
