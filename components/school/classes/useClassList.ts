"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    addSchoolClass,
    removeSchoolClass,
    updateSchoolClassStudentCount,
} from "@/lib/actions/school-setup.actions";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { SchoolClassItem } from "@/types/school-setup.types";
import type { UseClassListReturn } from "./types";

interface UseClassListParams {
    initialClasses: SchoolClassItem[];
    academicYearId?: string;
    onUpdate?: (classes: SchoolClassItem[]) => void;
}

export function useClassList({
    initialClasses,
    academicYearId,
    onUpdate,
}: UseClassListParams): UseClassListReturn {
    const [classes, setClasses] = useOptimistic(
        initialClasses,
        (_, nextClasses: SchoolClassItem[]) => nextClasses,
    );
    const [inputValue, setInputValue] = useState("");
    const [studentCountValue, setStudentCountValue] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    // Bulk add state
    const [bulkGrade, setBulkGrade] = useState("");
    const [bulkCount, setBulkCount] = useState("");
    const [bulkStudentCount, setBulkStudentCount] = useState("");

    function syncUpdate(updated: SchoolClassItem[]): void {
        startTransition(() => {
            setClasses(updated);
            onUpdate?.(updated);
        });
    }

    async function handleAdd(): Promise<void> {
        const name = inputValue.trim();
        if (!name) return;
        setErrorMsg(null);

        const expectedStudentCount = parseOptionalCount(studentCountValue);
        if (expectedStudentCount === null) {
            setErrorMsg("กรุณากรอกจำนวนนักเรียนเป็นตัวเลขมากกว่า 0");
            return;
        }

        const result = await addSchoolClass(
            name,
            expectedStudentCount,
            academicYearId,
        );
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "เพิ่มห้องเรียนไม่สำเร็จ");
            return;
        }
        if (result.data) {
            const updated = [...classes, result.data].sort((a, b) =>
                a.name.localeCompare(b.name, "th"),
            );
            syncUpdate(updated);
            toast.success(`เพิ่มห้อง "${result.data.name}" สำเร็จ`);
        }
        setInputValue("");
        setStudentCountValue("");
    }

    async function handleRemove(id: string, name: string): Promise<void> {
        setErrorMsg(null);
        const result = await removeSchoolClass(id);
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "ลบห้องเรียนไม่สำเร็จ");
            return;
        }
        syncUpdate(classes.filter((c) => c.id !== id));
        toast.success(`ลบห้อง "${name}" สำเร็จ`);
    }

    async function handleUpdateStudentCount(
        id: string,
        name: string,
        expectedStudentCount: number,
    ): Promise<void> {
        setErrorMsg(null);
        const result = await updateSchoolClassStudentCount(
            id,
            expectedStudentCount,
            academicYearId,
        );
        if (!result.success || !result.data) {
            setErrorMsg(result.message);
            toast.error(result.message || "อัปเดตจำนวนนักเรียนไม่สำเร็จ");
            return;
        }

        syncUpdate(
            classes.map((c) =>
                c.id === id
                    ? {
                          ...c,
                          expectedStudentCount:
                              result.data?.expectedStudentCount ?? 0,
                      }
                    : c,
            ),
        );
        toast.success(`อัปเดตจำนวนนักเรียนห้อง "${name}" สำเร็จ`);
    }

    async function handleBulkAdd(): Promise<void> {
        const grade = normalizeClassName(bulkGrade.trim());
        const count = parseInt(bulkCount, 10);
        const expectedStudentCount = parseOptionalCount(bulkStudentCount);
        if (!grade || isNaN(count) || count < 1 || count > 20) {
            setErrorMsg("กรุณากรอกระดับชั้นและจำนวนทับที่ถูกต้อง (1-20)");
            return;
        }
        if (expectedStudentCount === null) {
            setErrorMsg("กรุณากรอกจำนวนนักเรียนต่อห้องเป็นตัวเลขมากกว่า 0");
            return;
        }
        setErrorMsg(null);

        const names = Array.from(
            { length: count },
            (_, i) => `${grade}/${i + 1}`,
        );
        const existingNames = new Set(classes.map((c) => c.name));
        const toAdd = names.filter((n) => !existingNames.has(n));

        if (toAdd.length === 0) {
            setErrorMsg("ห้องเรียนทั้งหมดในชุดนี้มีอยู่แล้ว");
            return;
        }

        const results = await Promise.all(
            toAdd.map((n) =>
                addSchoolClass(n, expectedStudentCount, academicYearId),
            ),
        );
        const added = results
            .filter((r) => r.success && r.data)
            .map((r) => r.data as SchoolClassItem);

        if (added.length > 0) {
            const updated = [...classes, ...added].sort((a, b) =>
                a.name.localeCompare(b.name, "th"),
            );
            syncUpdate(updated);
            toast.success(`สร้างห้องเรียนสำเร็จ ${added.length} ห้อง`);
        } else {
            toast.error("ไม่สามารถสร้างห้องเรียนได้");
        }

        setBulkGrade("");
        setBulkCount("");
        setBulkStudentCount("");
    }

    return {
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
    };
}

function parseOptionalCount(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return parsed;
}
