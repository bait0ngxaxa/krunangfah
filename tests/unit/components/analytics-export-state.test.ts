import { describe, expect, it } from "vitest";

import {
    canExportNamedSubmission,
    canManageNamedSubmissionExport,
} from "@/components/analytics/export-state";

describe("analytics export state", () => {
    it("enables the named submission export for system_admin with assessment data", () => {
        expect(canExportNamedSubmission("system_admin", false, 1)).toBe(true);
    });

    it("enables the named submission export for a primary school_admin", () => {
        expect(canExportNamedSubmission("school_admin", true, 1)).toBe(true);
    });

    it("disables the named submission export when the active filter has no data", () => {
        expect(canExportNamedSubmission("system_admin", false, 0)).toBe(false);
    });

    it("never enables the named submission export for other roles", () => {
        expect(canExportNamedSubmission("school_admin", false, 10)).toBe(false);
        expect(canExportNamedSubmission("class_teacher", false, 10)).toBe(false);
        expect(canManageNamedSubmissionExport("class_teacher", false)).toBe(false);
    });
});
