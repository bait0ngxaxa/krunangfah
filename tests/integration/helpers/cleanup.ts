/**
 * Test Cleanup Helper
 *
 * Deletes all test data created during integration tests.
 * Follows FK order: children first, then parents.
 */

import { prisma } from "@/lib/prisma";
import { getCreatedIds } from "./seed";

/**
 * Delete all test data in correct FK order
 */
export async function cleanupAll() {
    const ids = getCreatedIds();

    // Delete in reverse dependency order
    if (ids.counselingSessions.length > 0) {
        await prisma.counselingSession
            .deleteMany({
                where: { id: { in: ids.counselingSessions } },
            })
            .catch(() => {});
    }

    // WorksheetUploads cascade from ActivityProgress
    if (ids.activityProgress.length > 0) {
        await prisma.worksheetUpload
            .deleteMany({
                where: {
                    activityProgressId: { in: ids.activityProgress },
                },
            })
            .catch(() => {});
        await prisma.activityProgress
            .deleteMany({
                where: { id: { in: ids.activityProgress } },
            })
            .catch(() => {});
    }

    if (ids.phqResults.length > 0) {
        await prisma.phqResult
            .deleteMany({
                where: { id: { in: ids.phqResults } },
            })
            .catch(() => {});
    }

    if (ids.students.length > 0) {
        await prisma.student
            .deleteMany({
                where: { id: { in: ids.students } },
            })
            .catch(() => {});
    }

    if (ids.passwordResetTokens.length > 0) {
        await prisma.passwordResetToken
            .deleteMany({
                where: { id: { in: ids.passwordResetTokens } },
            })
            .catch(() => {});
    }

    if (ids.teachers.length > 0) {
        await prisma.teacher
            .deleteMany({
                where: { id: { in: ids.teachers } },
            })
            .catch(() => {});
    }

    // Delete teacher invites created during tests
    await prisma.teacherInvite
        .deleteMany({
            where: {
                email: { startsWith: "test-" },
            },
        })
        .catch(() => {});

    if (ids.users.length > 0) {
        await prisma.user
            .deleteMany({
                where: { id: { in: ids.users } },
            })
            .catch(() => {});
    }

    if (ids.academicYears.length > 0) {
        await prisma.academicYear
            .deleteMany({
                where: { id: { in: ids.academicYears } },
            })
            .catch(() => {});
    }

    if (ids.schools.length > 0) {
        await prisma.school
            .deleteMany({
                where: { id: { in: ids.schools } },
            })
            .catch(() => {});
    }

    // Clear tracked IDs
    Object.keys(ids).forEach((key) => {
        (ids as Record<string, string[]>)[key] = [];
    });
}
