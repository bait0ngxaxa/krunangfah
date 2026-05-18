"use client";

import { ChevronDown, LayoutGrid, X } from "lucide-react";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import type { ClassGroupListProps } from "../types";
import type { SchoolClassItem } from "../types";

interface ClassGroup {
    grade: string;
    items: SchoolClassItem[];
    expectedStudentCount: number;
}

export function ClassGroupList({
    classes,
    readOnly,
    onRemove,
    onStudentCountChange,
}: ClassGroupListProps) {
    const totalExpectedStudents = classes.reduce(
        (sum, c) => sum + c.expectedStudentCount,
        0,
    );

    const groups = groupClassesByGrade(classes);

    return (
        <div className="p-4 bg-gray-50/50 rounded-2xl border-2 border-gray-100">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-400 flex items-center justify-center">
                        <LayoutGrid className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700">
                        ห้องเรียนที่มีอยู่แล้ว
                    </h3>
                </div>
                <span className="text-xs text-gray-400 font-medium bg-white px-2.5 py-1 rounded-full border border-gray-100">
                    {classes.length} ห้อง / {totalExpectedStudents} คน
                </span>
            </div>

            {classes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                    ยังไม่มีห้องเรียน — เพิ่มด้านบนได้เลย
                </p>
            ) : (
                <div className="grid gap-2">
                    {groups.map((group) => (
                        <ClassGroupPanel
                            key={group.grade}
                            group={group}
                            readOnly={readOnly}
                            defaultOpen={groups.length <= 3}
                            onRemove={onRemove}
                            onStudentCountChange={onStudentCountChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function groupClassesByGrade(classes: SchoolClassItem[]): ClassGroup[] {
    return Array.from(
        classes.reduce<Map<string, SchoolClassItem[]>>((acc, schoolClass) => {
            const slashIdx = schoolClass.name.indexOf("/");
            const prefix =
                slashIdx > 0
                    ? schoolClass.name.slice(0, slashIdx)
                    : schoolClass.name;
            const group = acc.get(prefix) ?? [];
            group.push(schoolClass);
            acc.set(prefix, group);
            return acc;
        }, new Map()),
    )
        .sort(([a], [b]) => a.localeCompare(b, "th"))
        .map(([grade, items]) => ({
            grade,
            items,
            expectedStudentCount: items.reduce(
                (sum, item) => sum + item.expectedStudentCount,
                0,
            ),
        }));
}

function ClassGroupPanel({
    group,
    readOnly,
    defaultOpen,
    onRemove,
    onStudentCountChange,
}: {
    group: ClassGroup;
    readOnly: boolean;
    defaultOpen: boolean;
    onRemove: ClassGroupListProps["onRemove"];
    onStudentCountChange: ClassGroupListProps["onStudentCountChange"];
}) {
    return (
        <details
            className="group rounded-xl border border-gray-100 bg-white shadow-sm"
            open={defaultOpen}
        >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">
                        {group.grade}
                    </p>
                    <p className="text-xs text-gray-400">
                        {group.items.length} ห้อง /{" "}
                        {group.expectedStudentCount} คน
                    </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((schoolClass) => (
                        <ClassItemRow
                            key={schoolClass.id}
                            schoolClass={schoolClass}
                            readOnly={readOnly}
                            onRemove={onRemove}
                            onStudentCountChange={onStudentCountChange}
                        />
                    ))}
                </div>
            </div>
        </details>
    );
}

function ClassItemRow({
    schoolClass,
    readOnly,
    onRemove,
    onStudentCountChange,
}: {
    schoolClass: SchoolClassItem;
    readOnly: boolean;
    onRemove: ClassGroupListProps["onRemove"];
    onStudentCountChange: ClassGroupListProps["onStudentCountChange"];
}) {
    return (
        <div className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="min-w-0 truncate text-sm font-bold text-gray-700">
                {schoolClass.name}
            </span>
            <div className="flex shrink-0 items-center gap-2">
                <StudentCountControl
                    schoolClass={schoolClass}
                    readOnly={readOnly}
                    onStudentCountChange={onStudentCountChange}
                />
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() =>
                            onRemove(schoolClass.id, schoolClass.name)
                        }
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="ลบห้อง"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

function StudentCountControl({
    schoolClass,
    readOnly,
    onStudentCountChange,
}: {
    schoolClass: SchoolClassItem;
    readOnly: boolean;
    onStudentCountChange: ClassGroupListProps["onStudentCountChange"];
}) {
    if (readOnly) {
        return (
            <span className="text-xs font-semibold text-gray-500">
                {schoolClass.expectedStudentCount} คน
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                key={`${schoolClass.id}-${schoolClass.expectedStudentCount}`}
                type="number"
                min={1}
                max={INPUT_LIMITS.school.classStudentCount}
                defaultValue={schoolClass.expectedStudentCount}
                aria-label={`จำนวนนักเรียน ${schoolClass.name}`}
                onBlur={(event) =>
                    saveStudentCount(
                        schoolClass,
                        event.currentTarget.value,
                        onStudentCountChange,
                    )
                }
                onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                        return;
                    }
                    event.preventDefault();
                    event.currentTarget.blur();
                }}
                className="w-14 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs font-semibold text-gray-700 outline-none focus:border-[var(--brand-primary)]"
            />
            <span className="text-xs font-semibold text-gray-500">คน</span>
        </div>
    );
}

async function saveStudentCount(
    schoolClass: SchoolClassItem,
    inputValue: string,
    onStudentCountChange: ClassGroupListProps["onStudentCountChange"],
): Promise<void> {
    const parsed = Number(inputValue.trim());
    if (
        !Number.isInteger(parsed) ||
        parsed < 1 ||
        parsed === schoolClass.expectedStudentCount
    ) {
        return;
    }

    await onStudentCountChange(schoolClass.id, schoolClass.name, parsed);
}
