import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImpactGrid } from "@/components/admin/data-management/ImpactGrid";
import type { ManagedPreview } from "@/components/admin/data-management/types";

const impact: ManagedPreview["impact"] = {
    userCount: 2,
    studentCount: 1,
    activeStudentCount: 1,
    phqResultCount: 3,
    activityProgressCount: 4,
    counselingSessionCount: 5,
    homeVisitCount: 6,
    worksheetUploadCount: 7,
    homeVisitPhotoCount: 8,
    pendingTeacherInviteCount: 9,
    pendingSchoolAdminInviteCount: 10,
    fileCount: 15,
};

describe("ImpactGrid", () => {
    it("shows only student-care impact labels for student targets", () => {
        const html = renderToStaticMarkup(
            <ImpactGrid impact={impact} targetType="student" />,
        );

        expect(html).toContain("ผลคัดกรองของนักเรียน");
        expect(html).toContain("กิจกรรมดูแล");
        expect(html).not.toContain("ผู้ใช้");
        expect(html).not.toContain("นักเรียนทั้งหมด");
        expect(html).not.toContain("คำเชิญ");
    });

    it("keeps school-wide impact labels for school targets", () => {
        const html = renderToStaticMarkup(
            <ImpactGrid impact={impact} targetType="school" />,
        );

        expect(html).toContain("บัญชีบุคลากร");
        expect(html).toContain("นักเรียนทั้งหมด");
        expect(html).toContain("คำเชิญที่ยังไม่ตอบรับ");
    });
});
