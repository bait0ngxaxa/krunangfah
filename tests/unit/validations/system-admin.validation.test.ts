import { describe, expect, it } from "vitest";
import {
    getSystemAdminValidationMessage,
    systemCareRecordDeleteSchema,
    systemCounselingEditSchema,
    systemHomeVisitEditSchema,
    systemPhqEditSchema,
    systemReferralEditSchema,
    systemSchoolEditSchema,
    systemSearchSchema,
    systemStaffAccountActionSchema,
    systemStaffAccountPermanentDeleteSchema,
    systemStudentEditSchema,
} from "@/lib/validations/system-admin.validation";

describe("systemSearchSchema", () => {
    it("accepts explicit entity search input", () => {
        const parsed = systemSearchSchema.safeParse({
            query: "ครูนางฟ้า",
            entityType: "staff",
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects empty initial search input", () => {
        const parsed = systemSearchSchema.safeParse({
            query: "",
            entityType: "all",
        });

        expect(parsed.success).toBe(false);
    });

    it("defaults entity type to all", () => {
        const parsed = systemSearchSchema.parse({ query: "demo" });

        expect(parsed.entityType).toBe("all");
    });
});

describe("system edit schemas", () => {
    it("requires a reason for school edits", () => {
        const parsed = systemSchoolEditSchema.safeParse({
            id: "ck12345678901234567890123",
            name: "โรงเรียนทดสอบ",
            province: "กรุงเทพฯ",
            reason: "",
        });

        expect(parsed.success).toBe(false);
    });

    it("accepts valid student profile edits", () => {
        const parsed = systemStudentEditSchema.safeParse({
            id: "ck12345678901234567890123",
            expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
            studentId: "1001",
            nationalId: "1234567890123",
            firstName: "สมชาย",
            lastName: "ใจดี",
            gender: "MALE",
            age: "13",
            class: "ม.1/1",
            status: "ACTIVE",
            reason: "แก้ข้อมูลนำเข้าผิด",
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects invalid national id values", () => {
        const parsed = systemStudentEditSchema.safeParse({
            id: "ck12345678901234567890123",
            studentId: "1001",
            nationalId: "abc",
            firstName: "สมชาย",
            lastName: "ใจดี",
            gender: "",
            age: "",
            class: "ม.1/1",
            status: "ACTIVE",
            reason: "แก้ข้อมูลนำเข้าผิด",
        });

        expect(parsed.success).toBe(false);
    });

    it("accepts valid counseling records from date inputs", () => {
        const parsed = systemCounselingEditSchema.safeParse({
            studentId: "ck12345678901234567890123",
            sessionDate: "2026-07-07",
            counselorName: "ครูนางฟ้า",
            summary: "พูดคุยติดตามสภาพใจ",
            reason: "เพิ่มรายการตกหล่น",
        });

        expect(parsed.success).toBe(true);
    });

    it("accepts home visits without next scheduled date", () => {
        const parsed = systemHomeVisitEditSchema.safeParse({
            studentId: "ck12345678901234567890123",
            visitDate: "2026-07-07",
            description: "เยี่ยมบ้านและพูดคุยกับผู้ปกครอง",
            nextScheduledDate: "",
            teacherName: "ครูที่ปรึกษา",
            teacherRole: "ครูประจำชั้น",
            reason: "เพิ่มรายการจากเอกสารเดิม",
        });

        expect(parsed.success).toBe(true);
    });

    it("requires a reason before deleting care records", () => {
        const parsed = systemCareRecordDeleteSchema.safeParse({
            id: "ck12345678901234567890123",
            reason: "",
        });

        expect(parsed.success).toBe(false);
    });

    it("returns the concrete validation message instead of a generic fallback", () => {
        const parsed = systemCareRecordDeleteSchema.safeParse({
            id: "ck12345678901234567890123",
            reason: "",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(
                getSystemAdminValidationMessage(
                    parsed.error,
                    "ข้อมูลลบรายการไม่ถูกต้อง",
                ),
            ).toBe("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
        }
    });

    it("accepts valid PHQ edits and recalculation inputs", () => {
        const parsed = systemPhqEditSchema.safeParse({
            id: "ck12345678901234567890123",
            q1: "0",
            q2: "1",
            q3: "2",
            q4: "3",
            q5: "0",
            q6: "1",
            q7: "2",
            q8: "3",
            q9: "0",
            q9a: false,
            q9b: false,
            referredToHospital: true,
            hospitalName: "โรงพยาบาลทดสอบ",
            reason: "แก้คะแนนจากเอกสารต้นฉบับ",
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects hospital referrals without hospital name", () => {
        const parsed = systemPhqEditSchema.safeParse({
            id: "ck12345678901234567890123",
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
            q5: 0,
            q6: 0,
            q7: 0,
            q8: 0,
            q9: 0,
            q9a: false,
            q9b: false,
            referredToHospital: true,
            hospitalName: "",
            reason: "แก้ข้อมูลการส่งต่อ",
        });

        expect(parsed.success).toBe(false);
    });

    it("requires a target teacher for referral edits", () => {
        const parsed = systemReferralEditSchema.safeParse({
            studentId: "ck12345678901234567890123",
            toTeacherUserId: "",
            reason: "แก้ครูผู้รับดูแล",
        });

        expect(parsed.success).toBe(false);
    });

    it("requires a reason before restoring a staff account", () => {
        const parsed = systemStaffAccountActionSchema.safeParse({
            id: "ck12345678901234567890123",
            reason: "",
        });

        expect(parsed.success).toBe(false);
    });

    it("requires a valid email confirmation for permanent account deletion", () => {
        const parsed = systemStaffAccountPermanentDeleteSchema.safeParse({
            id: "ck12345678901234567890123",
            reason: "ยืนยันว่าเป็นบัญชีทดสอบ",
            confirmation: "teacher",
        });

        expect(parsed.success).toBe(false);
    });
});
