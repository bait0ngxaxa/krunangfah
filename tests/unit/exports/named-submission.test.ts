import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { mapNamedSubmissionRecord } from "@/lib/exports/named-submission/mapper";
import { createNamedSubmissionFilename } from "@/lib/exports/named-submission/filename";
import type { NamedSubmissionRecord } from "@/lib/exports/named-submission/types";
import { parseNamedSubmissionFilters } from "@/lib/exports/named-submission/validation";
import {
    createNamedSubmissionWorkbook,
    NAMED_SUBMISSION_COLUMNS,
} from "@/lib/exports/named-submission/workbook";

const sampleRecord: NamedSubmissionRecord = {
    id: "cm9lt9j8f0000z1ntt9r2w0ab",
    assessmentRound: 2,
    totalScore: 15,
    riskLevel: "yellow",
    referredToHospital: true,
    createdAt: new Date("2026-06-24T08:00:00.000Z"),
    academicYear: { year: 2569, semester: 1 },
    student: {
        studentId: "000123",
        firstName: "สมชาย",
        lastName: "ใจดี",
        nationalId: "0123456789012",
        class: "ม.2/5",
        status: "ACTIVE",
        school: { name: "โรงเรียนทดสอบ", province: "กรุงเทพมหานคร" },
    },
    activityProgress: [
        { activityNumber: 1, status: "completed" },
        { activityNumber: 2, status: "completed" },
        { activityNumber: 3, status: "locked" },
        { activityNumber: 5, status: "in_progress" },
    ],
};

describe("named submission export", () => {
    it("parses supported filters and normalizes the class name", () => {
        const result = parseNamedSubmissionFilters({
            school: "cm9lt9j8f0000z1ntt9r2w0ab",
            class: "ม. 2/5",
            year: "2569",
            semester: "1",
            round: "2",
        });

        expect(result).toEqual({
            success: true,
            data: {
                schoolId: "cm9lt9j8f0000z1ntt9r2w0ab",
                className: "ม.2/5",
                academicYear: 2569,
                semester: 1,
                assessmentRound: 2,
            },
        });
    });

    it("rejects an invalid filter without exposing validation internals", () => {
        expect(parseNamedSubmissionFilters({ semester: "3" })).toEqual({
            success: false,
        });
    });

    it("creates an XLSX workbook with the approved columns and values", async () => {
        const row = mapNamedSubmissionRecord(sampleRecord);
        const content = await createNamedSubmissionWorkbook([row]);
        const workbook = new ExcelJS.Workbook();
        // @ts-expect-error ExcelJS bundles an older Buffer declaration than Node 20.
        await workbook.xlsx.load(Buffer.from(content));

        const worksheet = workbook.getWorksheet("รายชื่อผลคัดกรอง");
        expect(worksheet).toBeDefined();
        expect(worksheet?.getRow(1).values).toContain("เลขบัตรประชาชน");
        expect(worksheet?.getRow(2).getCell(3).value).toBe("000123");
        expect(worksheet?.getRow(2).getCell(6).value).toBe("0123456789012");
        expect(worksheet?.getRow(2).getCell(14).value).toBe("สีเหลือง");
        expect(worksheet?.getRow(2).getCell(15).value).toBe(4);
        expect(worksheet?.getRow(2).getCell(16).value).toBe(2);
        expect(worksheet?.getRow(2).getCell(17).value).toBe("ส่งต่อแล้ว");
        expect(worksheet?.columnCount).toBe(NAMED_SUBMISSION_COLUMNS.length);
    });

    it("creates a descriptive filename from the school and active filters", () => {
        const filename = createNamedSubmissionFilename([sampleRecord], {
            academicYear: 2569,
            semester: 1,
            assessmentRound: 2,
            className: "ม.2/5",
        });

        expect(filename).toBe(
            "รายชื่อผลคัดกรอง_โรงเรียนทดสอบ_ปี2569_เทอม1_รอบ2_ม.2-5.xlsx",
        );
    });
});
