import { describe, expect, it } from "vitest";
import {
    archivedImportClassMessage,
    partitionImportClasses,
} from "@/lib/actions/student/import-class-validation";

describe("import class validation", () => {
    it("separates archived classes from classes an import may target", () => {
        const { validClassSet, archivedClassSet } = partitionImportClasses([
            { name: "ม1/1", archivedAt: null },
            { name: "ม.1/5", archivedAt: new Date("2026-11-01T00:00:00.000Z") },
        ]);

        expect([...validClassSet]).toEqual(["ม.1/1"]);
        expect([...archivedClassSet]).toEqual(["ม.1/5"]);
    });

    it("explains how to use an archived class again", () => {
        expect(archivedImportClassMessage("ม.1/5")).toBe(
            'ห้อง "ม.1/5" ถูกเก็บเข้าคลังแล้ว กรุณาเพิ่มห้องนี้อีกครั้งในหน้าจัดการห้องเรียนก่อนนำเข้า',
        );
    });
});
