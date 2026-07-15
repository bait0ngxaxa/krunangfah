import { describe, expect, it } from "vitest";
import { createPermanentDeleteImpactFingerprint } from "@/lib/actions/data-management/permanent-delete-fingerprint";
import type { ImpactSummary } from "@/lib/actions/data-management/types";

const impact: ImpactSummary = {
    userCount: 1,
    studentCount: 2,
    activeStudentCount: 1,
    phqResultCount: 3,
    activityProgressCount: 4,
    counselingSessionCount: 5,
    homeVisitCount: 6,
    worksheetUploadCount: 7,
    homeVisitPhotoCount: 8,
    studentReferralCount: 9,
    pendingTeacherInviteCount: 10,
    pendingSchoolAdminInviteCount: 11,
    fileCount: 12,
};

const baseInput = {
    targetId: "student-1",
    targetUpdatedAt: new Date("2026-07-15T00:00:00.000Z"),
    impact,
};

describe("createPermanentDeleteImpactFingerprint", () => {
    it("is deterministic regardless of file URL query order", () => {
        const first = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            fileUrls: ["/b.png", "/a.png"],
        });
        const second = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            fileUrls: ["/a.png", "/b.png"],
        });

        expect(first).toBe(second);
        expect(first).toMatch(/^[a-f0-9]{64}$/);
    });

    it("changes when a dependent count changes", () => {
        const first = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            fileUrls: [],
        });
        const second = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            impact: { ...impact, phqResultCount: impact.phqResultCount + 1 },
            fileUrls: [],
        });

        expect(second).not.toBe(first);
    });

    it("changes when a file URL changes even with identical counts", () => {
        const first = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            fileUrls: ["/before.png"],
        });
        const second = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            fileUrls: ["/after.png"],
        });

        expect(second).not.toBe(first);
    });

    it("changes when the target timestamp changes", () => {
        const first = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            fileUrls: [],
        });
        const second = createPermanentDeleteImpactFingerprint({
            ...baseInput,
            targetUpdatedAt: new Date("2026-07-15T00:01:00.000Z"),
            fileUrls: [],
        });

        expect(second).not.toBe(first);
    });
});
