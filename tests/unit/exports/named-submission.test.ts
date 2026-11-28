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
    className: "ม.2/5",
    academicYear: { year: 2569, semester: 1, isCurrent: true },
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

    it("exports both rounds and leaves the identifier blank for students without one", async () => {
        const content = await createNamedSubmissionWorkbook([
            mapNamedSubmissionRecord(sampleRecord),
            mapNamedSubmissionRecord({
                ...sampleRecord,
                id: "cm9lt9j8f0000z1ntt9r2w0ac",
                assessmentRound: 2,
                riskLevel: "orange",
                student: { ...sampleRecord.student, studentId: "000124", nationalId: null },
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
        const nationalIdColumn = NAMED_SUBMISSION_COLUMNS.findIndex(({ key }) => key === "nationalId") + 1;
        expect(worksheet?.getCell(2, nationalIdColumn).text).toBe(sampleRecord.student.nationalId);
        expect(worksheet?.getCell(3, nationalIdColumn).text).toBe("");
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
        expect(worksheet?.getRow(1).getCell(18).value).toBe("ที่มาของห้อง");
        expect(worksheet?.getRow(2).getCell(18).value).toBe("ตอนประเมิน");
        expect(worksheet?.columnCount).toBe(NAMED_SUBMISSION_COLUMNS.length);
    });

    it.each([
        ["a current-term result uses the current class", true, "ม.1/1", "ม.2/5", "ตอนประเมิน"],
        ["a past-term result uses its snapshot", false, "ม.1/1", "ม.1/1", "ตอนประเมิน"],
        [
            "a past-term legacy result falls back to the current class",
            false,
            null,
            "ม.2/5",
            "ห้องปัจจุบัน (ข้อมูลก่อนมีการบันทึกห้อง)",
        ],
    ] as const)("%s", (_name, isCurrent, className, expectedClass, expectedSource) => {
        const row = mapNamedSubmissionRecord({
            ...sampleRecord,
            className,
            academicYear: { ...sampleRecord.academicYear, isCurrent },
        });

        expect(row.className).toBe(expectedClass);
        expect(row.classSource).toBe(expectedSource);
    });

    it("keeps the existing column order and appends the class source last", () => {
        expect(NAMED_SUBMISSION_COLUMNS.map(({ key }) => key)).toEqual([
            "schoolName",
            "province",
            "studentId",
            "firstName",
            "lastName",
            "nationalId",
            "className",
            "studentStatus",
            "academicYear",
            "semester",
            "assessmentRound",
            "assessmentDate",
            "totalScore",
            "riskGroup",
            "requiredActivityCount",
            "completedActivityCount",
            "referralStatus",
            "classSource",
        ]);
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
