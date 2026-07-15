import { describe, expect, it } from "vitest";
import {
    validatePermanentDeleteImpactFingerprint,
    validateSchoolPermanentDeleteTarget,
    validateStudentPermanentDeleteTarget,
} from "@/lib/actions/data-management/permanent-delete-guards";

const updatedAt = new Date("2026-07-15T00:00:00.000Z");

describe("permanent delete lifecycle guards", () => {
    it("prioritizes the test-data policy for an active student", () => {
        const failure = validateStudentPermanentDeleteTarget(
            {
                id: "student-1",
                studentId: "1001",
                firstName: "สมชาย",
                lastName: "ใจดี",
                schoolId: "school-1",
                schoolName: "โรงเรียนทดสอบ",
                class: "ม.1/1",
                status: "ACTIVE",
                disabledAt: null,
                isTestData: true,
                updatedAt,
            },
            updatedAt,
        );

        expect(failure).toEqual({
            success: false,
            message: "ต้องยกเลิกการตั้งนักเรียนเป็นข้อมูลทดสอบก่อนลบถาวร",
        });
    });

    it("prioritizes the test-data policy for an active school", () => {
        const failure = validateSchoolPermanentDeleteTarget(
            {
                id: "school-1",
                name: "โรงเรียนทดสอบ",
                province: "เชียงใหม่",
                disabledAt: null,
                isTestData: true,
                updatedAt,
            },
            updatedAt,
        );

        expect(failure).toEqual({
            success: false,
            message: "ต้องยกเลิกการตั้งโรงเรียนเป็นข้อมูลทดสอบก่อนลบถาวร",
        });
    });

    it("rejects a changed impact fingerprint with a stable stale code", () => {
        expect(validatePermanentDeleteImpactFingerprint("a".repeat(64), "b".repeat(64))).toEqual({
            success: false,
            code: "STALE_PREVIEW",
            message:
                "ผลกระทบของข้อมูลมีการเปลี่ยนแปลง กรุณาตรวจสอบรายการล่าสุดแล้วลองใหม่",
        });
    });
});
