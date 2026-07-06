import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { maskNationalId } from "./helpers";
import type { DataManagementSearchResult } from "./types";
import type { DataManagementSearchInput } from "@/lib/validations/data-management.validation";

const SEARCH_LIMIT = 20;

export async function searchDataManagementTargets(
    input: DataManagementSearchInput,
): Promise<DataManagementSearchResult> {
    const query = input.query?.trim() ?? "";
    const includeSchools = input.targetType === "all" || input.targetType === "school";
    const includeStudents = input.targetType === "all" || input.targetType === "student";

    const [schools, students] = await Promise.all([
        includeSchools ? searchSchools(input, query) : Promise.resolve([]),
        includeStudents ? searchStudents(input, query) : Promise.resolve([]),
    ]);

    return { schools, students };
}

async function searchSchools(input: DataManagementSearchInput, query: string) {
    const schools = await prisma.school.findMany({
        where: buildSchoolWhere(input, query),
        select: {
            id: true,
            name: true,
            province: true,
            disabledAt: true,
            isTestData: true,
            _count: { select: { users: true, students: true } },
        },
        orderBy: [{ disabledAt: "desc" }, { name: "asc" }],
        take: SEARCH_LIMIT,
    });

    return schools.map((school) => ({
        type: "school" as const,
        id: school.id,
        name: school.name,
        province: school.province,
        disabledAt: school.disabledAt,
        isTestData: school.isTestData,
        userCount: school._count.users,
        studentCount: school._count.students,
    }));
}

async function searchStudents(input: DataManagementSearchInput, query: string) {
    const students = await prisma.student.findMany({
        where: buildStudentWhere(input, query),
        select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            class: true,
            status: true,
            disabledAt: true,
            isTestData: true,
            schoolId: true,
            school: {
                select: {
                    name: true,
                    disabledAt: true,
                    isTestData: true,
                },
            },
        },
        orderBy: [{ disabledAt: "desc" }, { firstName: "asc" }],
        take: SEARCH_LIMIT,
    });

    return students.map((student) => ({
        type: "student" as const,
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        nationalIdMasked: maskNationalId(student.nationalId),
        class: student.class,
        status: student.status,
        disabledAt: student.disabledAt,
        isTestData: student.isTestData,
        schoolId: student.schoolId,
        schoolName: student.school.name,
        schoolIsTestData: student.school.isTestData,
        schoolDisabledAt: student.school.disabledAt,
    }));
}

function buildSchoolWhere(
    input: DataManagementSearchInput,
    query: string,
): Prisma.SchoolWhereInput {
    const where: Prisma.SchoolWhereInput = {};
    if (query) {
        where.OR = [
            { id: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
            { province: { contains: query, mode: "insensitive" } },
        ];
    }
    if (input.province) where.province = { contains: input.province };
    applyDataState(where, input.dataState);
    return where;
}

function buildStudentWhere(
    input: DataManagementSearchInput,
    query: string,
): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {};
    if (input.schoolId) where.schoolId = input.schoolId;
    if (input.province) where.school = { province: { contains: input.province } };
    if (query) {
        where.OR = [
            { id: { contains: query, mode: "insensitive" } },
            { studentId: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { nationalId: { contains: query, mode: "insensitive" } },
            { school: { name: { contains: query, mode: "insensitive" } } },
        ];
    }
    applyDataState(where, input.dataState);
    return where;
}

function applyDataState(
    where: Prisma.SchoolWhereInput | Prisma.StudentWhereInput,
    dataState: DataManagementSearchInput["dataState"],
): void {
    if (dataState === "disabled") where.disabledAt = { not: null };
    if (dataState === "test") where.isTestData = true;
    if (dataState === "active") {
        where.disabledAt = null;
        where.isTestData = false;
    }
}
