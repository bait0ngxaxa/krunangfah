import { describe, expect, it } from "vitest";
import { getClassScopeLabel } from "@/components/analytics/utils";

describe("analytics utils", () => {
    it("returns all scope for unfiltered admin views", () => {
        expect(getClassScopeLabel("all", "school_admin")).toBe("ทั้งหมด");
        expect(getClassScopeLabel("all", "system_admin")).toBe("ทั้งหมด");
    });

    it("returns selected class scope", () => {
        expect(getClassScopeLabel("ม.1/1", "school_admin")).toBe("ห้อง ม.1/1");
    });

    it("keeps advisory class scope for class teachers", () => {
        expect(getClassScopeLabel("all", "class_teacher")).toBe("ห้องที่ปรึกษา");
    });
});
