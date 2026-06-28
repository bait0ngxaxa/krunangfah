import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/database/prisma";
import {
    createMockUsers,
    mockSession,
    setupAuthMocks,
} from "./helpers/auth-mock";
import { cleanupAll } from "./helpers/cleanup";
import {
    createTestAcademicYear,
    createTestActivityProgress,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestUser,
} from "./helpers/seed";

setupAuthMocks();

const USERS = createMockUsers("nse");
const { GET } = await import("@/app/api/v1/exports/named-submission/route");

describe("Integration: named submission export route", () => {
    let schoolId = "";
    let otherSchoolId = "";
    let academicYear = 0;

    beforeAll(async () => {
        const school = await createTestSchool({ name: "โรงเรียนสำหรับส่งรายชื่อ" });
        const otherSchool = await createTestSchool({ name: "โรงเรียนอื่น" });
        const term = await createTestAcademicYear({ year: 2607, semester: 1 });
        schoolId = school.id;
        otherSchoolId = otherSchool.id;
        academicYear = term.year;
        USERS.schoolAdmin.schoolId = school.id;

        await createTestUser(USERS.systemAdmin);
        await createTestUser(USERS.schoolAdmin, school.id);

        const included = await createTestStudent(school.id, {
            studentId: "000123",
            class: "ม.2/5",
            firstName: "สมชาย",
        });
        await prisma.student.update({
            where: { id: included.id },
            data: { nationalId: "0123456789012" },
        });
        const includedPhq = await createTestPhqResult(
            included.id,
            term.id,
            USERS.systemAdmin.id,
            {
                assessmentRound: 1,
                riskLevel: "yellow",
                totalScore: 15,
            },
        );
        await createTestActivityProgress(included.id, includedPhq.id, 1, {
            status: "completed",
        });
        await createTestActivityProgress(included.id, includedPhq.id, 2, {
            status: "completed",
        });
        await createTestActivityProgress(included.id, includedPhq.id, 3, {
            status: "locked",
        });
        await createTestActivityProgress(included.id, includedPhq.id, 5, {
            status: "in_progress",
        });

        const excluded = await createTestStudent(otherSchool.id, {
            studentId: "000999",
            class: "ม.2/5",
        });
        await createTestPhqResult(excluded.id, term.id, USERS.systemAdmin.id, {
            assessmentRound: 1,
            riskLevel: "red",
            totalScore: 22,
        });
    });

    afterAll(async () => {
        await cleanupAll();
    });

    function buildRequest(): NextRequest {
        const params = new URLSearchParams({
            school: schoolId,
            year: academicYear.toString(),
            semester: "1",
            round: "1",
        });
        return new NextRequest(
            `http://localhost/api/v1/exports/named-submission?${params.toString()}`,
        );
    }

    it("allows system_admin to download filtered XLSX data", async () => {
        mockSession(USERS.systemAdmin);

        const response = await GET(buildRequest());
        const workbook = new ExcelJS.Workbook();
        // @ts-expect-error ExcelJS bundles an older Buffer declaration than Node 20.
        await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
        const worksheet = workbook.getWorksheet("รายชื่อผลคัดกรอง");

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(worksheet?.rowCount).toBe(2);
        expect(worksheet?.getRow(2).getCell(1).value).toBe(
            "โรงเรียนสำหรับส่งรายชื่อ",
        );
        expect(worksheet?.getRow(2).getCell(6).value).toBe("0123456789012");
        expect(worksheet?.getRow(2).getCell(13).value).toBe(15);
        expect(worksheet?.getRow(2).getCell(14).value).toBe("สีเหลือง");
        expect(worksheet?.getRow(2).getCell(15).value).toBe(4);
        expect(worksheet?.getRow(2).getCell(16).value).toBe(2);
    });

    it("allows primary school_admin and enforces its own school scope", async () => {
        mockSession(USERS.schoolAdmin);
        const params = new URLSearchParams({
            school: otherSchoolId,
            year: academicYear.toString(),
            semester: "1",
            round: "1",
        });
        const request = new NextRequest(
            `http://localhost/api/v1/exports/named-submission?${params.toString()}`,
        );

        const response = await GET(request);
        const workbook = new ExcelJS.Workbook();
        // @ts-expect-error ExcelJS bundles an older Buffer declaration than Node 20.
        await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
        const worksheet = workbook.getWorksheet("รายชื่อผลคัดกรอง");

        expect(response.status).toBe(200);
        expect(worksheet?.rowCount).toBe(2);
        expect(worksheet?.getRow(2).getCell(1).value).toBe(
            "โรงเรียนสำหรับส่งรายชื่อ",
        );
    });

    it("does not create an empty workbook when the filter has no assessment data", async () => {
        mockSession(USERS.systemAdmin);
        const params = new URLSearchParams({
            school: schoolId,
            year: academicYear.toString(),
            semester: "1",
            round: "2",
        });
        const request = new NextRequest(
            `http://localhost/api/v1/exports/named-submission?${params.toString()}`,
        );

        const response = await GET(request);

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: "ไม่พบข้อมูลผลคัดกรองตามตัวกรองที่เลือก",
        });
    });
});
