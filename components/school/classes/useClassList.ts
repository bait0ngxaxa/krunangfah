"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    addSchoolClass,
    removeSchoolClass,
} from "@/lib/actions/school-setup.actions";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type { SchoolClassItem } from "@/types/school-setup.types";
import type { UseClassListReturn } from "./types";

interface UseClassListParams {
    initialClasses: SchoolClassItem[];
    onUpdate?: (classes: SchoolClassItem[]) => void;
}

export function useClassList({
    initialClasses,
    onUpdate,
}: UseClassListParams): UseClassListReturn {
    const [classes, setClasses] = useState<SchoolClassItem[]>(initialClasses);
    const [inputValue, setInputValue] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    // Bulk add state
    const [bulkGrade, setBulkGrade] = useState("");
    const [bulkCount, setBulkCount] = useState("");

    function syncUpdate(updated: SchoolClassItem[]): void {
        setClasses(updated);
        onUpdate?.(updated);
    }

    async function handleAdd(): Promise<void> {
        const name = inputValue.trim();
        if (!name) return;
        setErrorMsg(null);

        const result = await addSchoolClass(name);
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
    }

    async function handleRemove(id: string, name: string): Promise<void> {
        setErrorMsg(null);
        const result = await removeSchoolClass(id);
        if (!result.success) {
            setErrorMsg(result.message);
            toast.error(result.message || "ลบห้องเรียนไม่สำเร็จ");
            return;
        }
        startTransition(() => {
            syncUpdate(classes.filter((c) => c.id !== id));
        });
        toast.success(`ลบห้อง "${name}" สำเร็จ`);
    }

    async function handleBulkAdd(): Promise<void> {
        const grade = normalizeClassName(bulkGrade.trim());
        const count = parseInt(bulkCount, 10);
        if (!grade || isNaN(count) || count < 1 || count > 20) {
            setErrorMsg("กรุณากรอกระดับชั้นและจำนวนทับที่ถูกต้อง (1-20)");
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

        const results = await Promise.all(toAdd.map((n) => addSchoolClass(n)));
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
    }

    return {
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
    };
}
