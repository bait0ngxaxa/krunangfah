import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { maskNationalId } from "@/lib/actions/data-management/helpers";
import type { SystemSearchInput } from "@/lib/validations/system-admin.validation";
import type {
    SchoolEntityResult,
    StaffEntityResult,
    StudentEntityResult,
    SystemSearchResult,
} from "./types";

const ENTITY_LIMIT = 8;

export async function searchSystemEntities(
    input: SystemSearchInput,
): Promise<SystemSearchResult> {
    const query = input.query.trim();
    const [schools, staffs, students] = await Promise.all([
        shouldSearch(input.entityType, "school")
            ? searchSchools(query)
            : Promise.resolve([]),
        shouldSearch(input.entityType, "staff")
            ? searchStaffs(query)
            : Promise.resolve([]),
        shouldSearch(input.entityType, "student")
            ? searchStudents(query)
            : Promise.resolve([]),
    ]);

    return { schools, staffs, students };
}

function shouldSearch(
    selected: SystemSearchInput["entityType"],
    target: Exclude<SystemSearchInput["entityType"], "all">,
): boolean {
    return selected === "all" || selected === target;
}

async function searchSchools(query: string): Promise<SchoolEntityResult[]> {
    const schools = await prisma.school.findMany({
        where: {
            OR: [
                { id: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { province: { contains: query, mode: "insensitive" } },
            ],
        },
        select: {
            id: true,
            updatedAt: true,
            name: true,
            province: true,
            disabledAt: true,
            isTestData: true,
            _count: { select: { users: true, students: true } },
        },
        orderBy: [{ disabledAt: "desc" }, { name: "asc" }, { id: "asc" }],
        take: ENTITY_LIMIT,
    });

    return schools.map((school) => ({
        type: "school",
        id: school.id,
        updatedAt: school.updatedAt,
        name: school.name,
        province: school.province,
        disabledAt: school.disabledAt,
        isTestData: school.isTestData,
        userCount: school._count.users,
        studentCount: school._count.students,
    }));
}

async function searchStaffs(query: string): Promise<StaffEntityResult[]> {
    const users = await prisma.user.findMany({
        where: buildStaffWhere(query),
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isPrimary: true,
            deletedAt: true,
            schoolId: true,
            school: { select: { name: true } },
            teacher: {
                select: {
                    id: true,
                    updatedAt: true,
                    firstName: true,
                    lastName: true,
                    age: true,
                    advisoryClass: true,
                    schoolRole: true,
                    projectRole: true,
                },
            },
        },
        orderBy: [{ deletedAt: "desc" }, { createdAt: "desc" }],
        take: ENTITY_LIMIT,
    });

    return users.map((user) => ({
        type: "staff",
        id: user.id,
        updatedAt: user.teacher?.updatedAt ?? null,
        email: user.email,
        name: user.name,
        role: user.role,
        isPrimary: user.isPrimary,
        deletedAt: user.deletedAt,
        schoolId: user.schoolId,
        schoolName: user.school?.name ?? null,
        hasTeacherProfile: user.teacher !== null,
        teacherId: user.teacher?.id ?? null,
        teacherName: user.teacher
            ? `${user.teacher.firstName} ${user.teacher.lastName}`
            : null,
        firstName: user.teacher?.firstName ?? null,
        lastName: user.teacher?.lastName ?? null,
        age: user.teacher?.age ?? null,
        advisoryClass: user.teacher?.advisoryClass ?? null,
        schoolRole: user.teacher?.schoolRole ?? null,
        projectRole: user.teacher?.projectRole ?? null,
    }));
}

async function searchStudents(query: string): Promise<StudentEntityResult[]> {
    const students = await prisma.student.findMany({
        where: {
            OR: [
                { id: { contains: query, mode: "insensitive" } },
                { studentId: { contains: query, mode: "insensitive" } },
                { nationalId: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { class: { contains: query, mode: "insensitive" } },
                { school: { name: { contains: query, mode: "insensitive" } } },
            ],
        },
        select: {
            id: true,
            updatedAt: true,
            studentId: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            gender: true,
            age: true,
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
                    classes: {
                        select: { id: true, name: true },
                        orderBy: { name: "asc" },
                    },
                },
            },
        },
        orderBy: [{ disabledAt: "desc" }, { firstName: "asc" }, { id: "asc" }],
        take: ENTITY_LIMIT,
    });

    return students.map((student) => ({
        type: "student",
        id: student.id,
        updatedAt: student.updatedAt,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        nationalIdMasked: maskNationalId(student.nationalId),
        nationalId: student.nationalId,
        gender: student.gender,
        age: student.age,
        class: student.class,
        status: student.status,
        disabledAt: student.disabledAt,
        isTestData: student.isTestData,
        schoolId: student.schoolId,
        schoolName: student.school.name,
        schoolDisabledAt: student.school.disabledAt,
        schoolIsTestData: student.school.isTestData,
        classOptions: student.school.classes,
    }));
}

function buildStaffWhere(query: string): Prisma.UserWhereInput {
    return {
        OR: [
            { id: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
            { school: { name: { contains: query, mode: "insensitive" } } },
            { teacher: { firstName: { contains: query, mode: "insensitive" } } },
            { teacher: { lastName: { contains: query, mode: "insensitive" } } },
            { teacher: { advisoryClass: { contains: query, mode: "insensitive" } } },
            { teacher: { schoolRole: { contains: query, mode: "insensitive" } } },
        ],
    };
}
