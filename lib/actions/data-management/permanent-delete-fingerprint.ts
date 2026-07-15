import { createHash } from "node:crypto";
import type { ImpactSummary } from "./types";

interface PermanentDeleteFingerprintInput {
    targetId: string;
    targetUpdatedAt: Date;
    impact: ImpactSummary;
    fileUrls: string[];
}

export function createPermanentDeleteImpactFingerprint(
    input: PermanentDeleteFingerprintInput,
): string {
    const canonical = JSON.stringify({
        targetId: input.targetId,
        targetUpdatedAt: input.targetUpdatedAt.toISOString(),
        impact: {
            userCount: input.impact.userCount,
            studentCount: input.impact.studentCount,
            activeStudentCount: input.impact.activeStudentCount,
            phqResultCount: input.impact.phqResultCount,
            activityProgressCount: input.impact.activityProgressCount,
            counselingSessionCount: input.impact.counselingSessionCount,
            homeVisitCount: input.impact.homeVisitCount,
            worksheetUploadCount: input.impact.worksheetUploadCount,
            homeVisitPhotoCount: input.impact.homeVisitPhotoCount,
            studentReferralCount: input.impact.studentReferralCount,
            pendingTeacherInviteCount: input.impact.pendingTeacherInviteCount,
            pendingSchoolAdminInviteCount:
                input.impact.pendingSchoolAdminInviteCount,
            fileCount: input.impact.fileCount,
        },
        fileUrls: [...input.fileUrls].sort(),
    });

    return createHash("sha256").update(canonical, "utf8").digest("hex");
}
