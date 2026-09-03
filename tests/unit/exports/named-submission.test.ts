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
    assessmentRound: 1,
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

    it.each([
        ["green", 3],
        ["yellow", 4],
        ["orange", 5],
    ] as const)(
        "maps round 1 %s risk to its activity counts",
        (riskLevel, requiredActivityCount) => {
            const row = mapNamedSubmissionRecord({
                ...sampleRecord,
                riskLevel,
                activityProgress: [
                    { activityNumber: 1, status: "completed" },
                    { activityNumber: 2, status: "completed" },
                    { activityNumber: 5, status: "in_progress" },
                ],
            });

            expect(row.requiredActivityCount).toBe(requiredActivityCount);
            expect(row.completedActivityCount).toBe(2);
        },
    );

    it("keeps a legitimate round 1 zero-activity risk numeric", () => {
        const row = mapNamedSubmissionRecord({
            ...sampleRecord,
            riskLevel: "blue",
            activityProgress: [
                { activityNumber: 1, status: "completed" },
            ],
        });

        expect(row.requiredActivityCount).toBe(0);
        expect(row.completedActivityCount).toBe(0);
    });

    it.each(["green", "yellow", "orange"] as const)(
        "marks round 2 %s activity counts as not applicable",
        (riskLevel) => {
            const row = mapNamedSubmissionRecord({
                ...sampleRecord,
                assessmentRound: 2,
                riskLevel,
                activityProgress: [
                    { activityNumber: 1, status: "completed" },
                    { activityNumber: 2, status: "completed" },
                    { activityNumber: 3, status: "completed" },
                    { activityNumber: 4, status: "completed" },
                    { activityNumber: 5, status: "completed" },
                ],
            });

            expect(row.requiredActivityCount).toBeNull();
            expect(row.completedActivityCount).toBeNull();
        },
    );

    it("keeps round 1 and round 2 activity semantics separate in an all-round export", async () => {
        const content = await createNamedSubmissionWorkbook([
            mapNamedSubmissionRecord(sampleRecord),
            mapNamedSubmissionRecord({
                ...sampleRecord,
                id: "cm9lt9j8f0000z1ntt9r2w0ac",
                assessmentRound: 2,
                riskLevel: "orange",
                activityProgress: [
                    { activityNumber: 1, status: "completed" },
                    { activityNumber: 2, status: "completed" },
                    { activityNumber: 3, status: "completed" },
                    { activityNumber: 4, status: "completed" },
                    { activityNumber: 5, status: "completed" },
                ],
            }),
        ]);
        const workbook = new ExcelJS.Workbook();
        // @ts-expect-error ExcelJS bundles an older Buffer declaration than Node 20.
        await workbook.xlsx.load(Buffer.from(content));

        const worksheet = workbook.getWorksheet("รายชื่อผลคัดกรอง");
        expect(worksheet?.getRow(2).getCell(15).value).toBe(4);
        expect(worksheet?.getRow(2).getCell(16).value).toBe(2);
        expect(worksheet?.getRow(3).getCell(15).value).toBeNull();
        expect(worksheet?.getRow(3).getCell(16).value).toBeNull();
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
        expect(worksheet?.getRow(1).getCell(15).value).toBe(
            "กิจกรรมที่ต้องทำ (ครั้งที่ 1)",
        );
        expect(worksheet?.getRow(1).getCell(16).value).toBe(
            "กิจกรรมที่ทำแล้ว (ครั้งที่ 1)",
        );
        expect(worksheet?.getRow(2).getCell(3).value).toBe("000123");
        expect(worksheet?.getRow(2).getCell(6).value).toBe("0123456789012");
        expect(worksheet?.getRow(2).getCell(14).value).toBe("สีเหลือง");
        expect(worksheet?.getRow(2).getCell(15).value).toBe(4);
        expect(worksheet?.getRow(2).getCell(16).value).toBe(2);
        expect(worksheet?.getRow(2).getCell(17).value).toBe("ส่งต่อแล้ว");
        expect(worksheet?.columnCount).toBe(NAMED_SUBMISSION_COLUMNS.length);
    });

    it("preserves a G national ID as text", async () => {
        const record = {
            ...sampleRecord,
            student: {
                ...sampleRecord.student,
                nationalId: "G0123456789012",
            },
        };
        const content = await createNamedSubmissionWorkbook([
            mapNamedSubmissionRecord(record),
        ]);
        const workbook = new ExcelJS.Workbook();
        // @ts-expect-error ExcelJS bundles an older Buffer declaration than Node 20.
        await workbook.xlsx.load(Buffer.from(content));

        const worksheet = workbook.getWorksheet("รายชื่อผลคัดกรอง");
        expect(worksheet?.getRow(2).getCell(6).value).toBe("G0123456789012");
        expect(worksheet?.getColumn(6).numFmt).toBe("@");
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
