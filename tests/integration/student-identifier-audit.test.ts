import type { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { createMockUsers, mockSession } from "./helpers/auth-mock";
import { cleanupAll } from "./helpers/cleanup";
import { createTestAcademicYear, createTestPhqResult, createTestSchool, createTestStudent, createTestUser } from "./helpers/seed";

const auditFault = vi.hoisted(() => ({ enabled: false, stagedUpdate: false }));

vi.mock("@/lib/utils/serializable-transaction", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/utils/serializable-transaction")>();

    return {
        runSerializableTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>, maxRetries?: number): Promise<T> {
            return actual.runSerializableTransaction((tx) => {
                if (!auditFault.enabled) return callback(tx);

                return callback(new Proxy(tx, {
                    get(target, property, receiver) {
                        if (property !== "studentIdentifierAuditEvent") return Reflect.get(target, property, receiver);
                        return {
                            async create(args: Prisma.StudentIdentifierAuditEventCreateArgs) {
                                const student = await tx.student.findUniqueOrThrow({
                                    where: { id: args.data.studentId }, select: { nationalId: true },
                                });
                                auditFault.stagedUpdate = student.nationalId === FIRST_ID;
                                // Exercise a real PostgreSQL CHECK failure after the Student write.
                                return tx.studentIdentifierAuditEvent.create({
                                    data: { ...args.data, actorRole: "class_teacher" },
                                });
                            },
                        };
                    },
                }));
            }, maxRetries);
        },
    };
});

const USERS = createMockUsers("identifier-audit");
const OTHER = createMockUsers("identifier-audit-other");
const FIRST_ID = "G9000000001801";
const SECOND_ID = "9000000001802";
const REASON = "ตรวจสอบเอกสารทะเบียนแล้ว";
const { getStudentIdentifierForEdit, updateStudentIdentifier, updateStudentProfile } =
    await import("@/lib/actions/student/mutations");

describe("School Admin identifier audit", () => {
    let schoolId: string;
    let academicYearId: string;

    beforeAll(async () => {
        schoolId = (await createTestSchool()).id;
        const otherSchoolId = (await createTestSchool()).id;
        await createTestUser(USERS.schoolAdmin, schoolId);
        await createTestUser(OTHER.schoolAdmin, otherSchoolId);
        academicYearId = (await createTestAcademicYear({ year: 9824 })).id;
    });

    afterAll(async () => {
        if (schoolId) await prisma.studentIdentifierAuditEvent.deleteMany({ where: { schoolId } });
        await cleanupAll();
    });

    async function fixture(studentCode: string) {
        mockSession(USERS.schoolAdmin);
        const student = await createTestStudent(schoolId, { studentId: studentCode });
        const phq = await createTestPhqResult(student.id, academicYearId, USERS.schoolAdmin.id);
        return { student, context: { activePhqResultId: phq.id } };
    }

    async function editVersion(studentId: string): Promise<string> {
        const result = await getStudentIdentifierForEdit(studentId);
        if (!result.success) throw new Error(result.message);
        return result.updatedAt;
    }

    it("adds, replaces and clears the identifier with masked audit history and no event for no-ops", async () => {
        const { student, context } = await fixture("audit-changes");
        const where = { id: student.id };
        const expectedEvents = [
            { action: "ADDED", previousMasked: null, newMasked: "G*********1801" },
            { action: "REPLACED", previousMasked: "G*********1801", newMasked: "*********1802" },
            { action: "CLEARED", previousMasked: "*********1802", newMasked: null },
        ];

        for (const [index, nationalId] of [FIRST_ID, SECOND_ID, null].entries()) {
            const expectedUpdatedAt = await editVersion(student.id);
            await expect(updateStudentIdentifier(student.id, { nationalId, expectedUpdatedAt, reason: `  ${REASON}  ` }, context))
                .resolves.toMatchObject({ success: true });
            const changed = await prisma.student.findUniqueOrThrow({ where });
            expect(changed.nationalId).toBe(nationalId);
            await expect(updateStudentIdentifier(student.id, {
                nationalId, expectedUpdatedAt: changed.updatedAt.toISOString(), reason: REASON,
            }, context)).resolves.toMatchObject({ success: true, message: "เลขประจำตัวไม่มีการเปลี่ยนแปลง" });
            await expect(prisma.student.findUniqueOrThrow({ where })).resolves.toEqual(changed);
            await expect(prisma.studentIdentifierAuditEvent.count({ where: { studentId: student.id } })).resolves.toBe(index + 1);
        }

        const events = await prisma.studentIdentifierAuditEvent.findMany({ where: { studentId: student.id } });
        expect(events).toEqual(expect.arrayContaining(expectedEvents.map((event) => expect.objectContaining({
            ...event, studentId: student.id, schoolId, actorUserId: USERS.schoolAdmin.id,
            actorRole: "school_admin", reason: REASON, createdAt: expect.any(Date),
        }))));
        expect(JSON.stringify(events)).not.toContain(FIRST_ID);
        expect(JSON.stringify(events)).not.toContain(SECOND_ID);
    });

    it("rejects invalid reasons, unauthorized contexts, stale versions and unique violations without writing events", async () => {
        const { student, context } = await fixture("audit-rejected");
        const owner = await createTestStudent(schoolId, { studentId: "existing-identifier-owner" });
        await prisma.student.update({ where: { id: owner.id }, data: { nationalId: SECOND_ID } });
        const expectedUpdatedAt = await editVersion(student.id);
        const input = { nationalId: FIRST_ID, expectedUpdatedAt, reason: REASON };

        for (const user of [USERS.classTeacher, USERS.systemAdmin, OTHER.schoolAdmin]) {
            mockSession(user);
            await expect(updateStudentIdentifier(student.id, input, context)).resolves.toMatchObject({ success: false });
        }
        mockSession(USERS.schoolAdmin);
        await expect(updateStudentIdentifier(student.id, input, { activePhqResultId: "historical" }))
            .resolves.toMatchObject({ success: false, message: expect.stringContaining("กำลังดูข้อมูลย้อนหลัง") });
        await expect(updateStudentIdentifier(student.id, { ...input, expectedUpdatedAt: "2001-01-01T00:00:00.000Z" }, context))
            .resolves.toMatchObject({ success: false, message: expect.stringContaining("ข้อมูลนักเรียนมีการเปลี่ยนแปลง") });
        await expect(updateStudentIdentifier(student.id, { ...input, nationalId: SECOND_ID }, context))
            .resolves.toMatchObject({ success: false, message: "เลขประจำตัวนี้มีอยู่ในระบบแล้ว" });

        for (const reason of [undefined, "  ", "ab", "ก".repeat(1001), `หมายเลขเดิม ${FIRST_ID}`]) {
            await expect(updateStudentIdentifier(student.id, { ...input, reason }, context)).resolves.toMatchObject({ success: false });
        }
        await expect(updateStudentProfile(student.id, {
            studentId: student.studentId, firstName: student.firstName, lastName: student.lastName,
            class: student.class, gender: null, age: null, status: "ACTIVE", nationalId: FIRST_ID,
        }, context)).resolves.toMatchObject({ success: false });

        await expect(prisma.student.findUniqueOrThrow({ where: { id: student.id } })).resolves.toEqual(student);
        await expect(prisma.studentIdentifierAuditEvent.count({ where: { studentId: student.id } })).resolves.toBe(0);
    });

    it("rolls back a staged identifier update when the audit INSERT violates a PostgreSQL constraint", async () => {
        const { student, context } = await fixture("audit-rollback");
        const expectedUpdatedAt = await editVersion(student.id);
        auditFault.enabled = true;
        try {
            await expect(updateStudentIdentifier(student.id, { nationalId: FIRST_ID, expectedUpdatedAt, reason: REASON }, context))
                .resolves.toMatchObject({ success: false, message: "ไม่สามารถบันทึกเลขประจำตัวได้" });
        } finally {
            auditFault.enabled = false;
        }
        expect(auditFault.stagedUpdate).toBe(true);
        await expect(prisma.student.findUniqueOrThrow({ where: { id: student.id } })).resolves.toEqual(student);
        await expect(prisma.studentIdentifierAuditEvent.count({ where: { studentId: student.id } })).resolves.toBe(0);
    });

    it("keeps the existing Student identifier format constraint in force", async () => {
        const { student } = await fixture("audit-malformed-legacy");
        await expect(prisma.student.update({ where: { id: student.id }, data: { nationalId: "123" } }))
            .rejects.toThrow("students_national_id_format_check");
        await expect(getStudentIdentifierForEdit(student.id)).resolves.toMatchObject({ success: true, masked: null });
        await expect(prisma.studentIdentifierAuditEvent.count({ where: { studentId: student.id } })).resolves.toBe(0);
    });
});
