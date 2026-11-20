/**
 * Test Cleanup Helper
 *
 * Deletes all test data created during integration tests.
 * Follows FK order: children first, then parents.
 */

import { prisma } from "@/lib/database/prisma";
import { getCreatedIds } from "./seed";
import { assertVerifiedIntegrationClient } from "../database-safety";

/**
 * Delete all test data in correct FK order
 */
export async function cleanupAll(ids = getCreatedIds()): Promise<void> {
    assertVerifiedIntegrationClient(prisma);

    // Delete in reverse dependency order
    if (ids.counselingSessions.length > 0) {
        await prisma.counselingSession
            .deleteMany({
                where: { id: { in: ids.counselingSessions } },
            })
            .catch(() => {});
    }

    // Include progress produced by actions for owned PHQ results. Worksheets cascade.
    if (ids.activityProgress.length > 0 || ids.phqResults.length > 0) {
        await prisma.activityProgress
            .deleteMany({
                where: { OR: [{ id: { in: ids.activityProgress } }, { phqResultId: { in: ids.phqResults } }] },
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

    if (ids.users.length > 0) {
        await prisma.user
            .deleteMany({
                where: { id: { in: ids.users } },
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

    // Delete terms last so failures from remaining references surface in the test.
    if (ids.academicYears.length > 0) {
        await prisma.academicYear.deleteMany({ where: { id: { in: ids.academicYears } } });
    }

    for (const tracked of Object.values(ids)) tracked.length = 0;
}

