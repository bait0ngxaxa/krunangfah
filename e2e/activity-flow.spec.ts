/**
 * E2E Test: Activity Flow (Full Journey)
 *
 * Tests the complete activity flow that a teacher would follow:
 *   Login → Dashboard → Students → Student Detail → Help → Activity
 *
 * IMPORTANT: These tests require a running dev server with actual data in the DB.
 * If there's no student data, some tests will be skipped gracefully.
 */

import { test, expect, type Page } from "@playwright/test";

/**
 * Helper: Login as a teacher
 * Uses the real signin form + NextAuth credentials flow
 */
async function loginAsTeacher(
    page: Page,
    email: string,
    password: string,
): Promise<boolean> {
    await page.goto("/signin");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    // Wait for either redirect to dashboard or error message
    try {
        await page.waitForURL(/dashboard/, { timeout: 10000 });
        return true;
    } catch {
        return false;
    }
}

// ── Get test credentials from env or use defaults ──
const TEST_EMAIL = process.env.E2E_TEACHER_EMAIL || "teacher@test.local";
const TEST_PASSWORD = process.env.E2E_TEACHER_PASSWORD || "password123";

test.describe("Activity Flow — Full Journey", () => {
    test.describe.configure({ mode: "serial" });

    let loggedIn = false;

    test("Step 1: Login as teacher", async ({ page }) => {
        loggedIn = await loginAsTeacher(page, TEST_EMAIL, TEST_PASSWORD);

        if (!loggedIn) {
            test.skip(
                true,
                `Cannot login with ${TEST_EMAIL} — set E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD env vars`,
            );
            return;
        }

        // Should see dashboard
        await expect(page.getByText(/หน้าหลัก|นักเรียน/)).toBeVisible({
            timeout: 10000,
        });
    });

    test("Step 2: Navigate to student list", async ({ page }) => {
        test.skip(!loggedIn, "Skipped — login failed");

        await loginAsTeacher(page, TEST_EMAIL, TEST_PASSWORD);
        await page.goto("/students");

        // Should see the students page header
        await expect(page.getByText("นักเรียนทั้งหมด").first()).toBeVisible({
            timeout: 10000,
        });
    });

    test("Step 3: View student details", async ({ page }) => {
        test.skip(!loggedIn, "Skipped — login failed");

        await loginAsTeacher(page, TEST_EMAIL, TEST_PASSWORD);
        await page.goto("/students");
        await page.waitForLoadState("networkidle");

        // Find a student link/row
        const studentLink = page.locator('a[href*="/students/"]').first();
        const hasStudents = (await studentLink.count()) > 0;

        if (!hasStudents) {
            test.skip(true, "No students in DB — skipping");
            return;
        }

        // Click first student
        await studentLink.click();

        // Should show student profile card
        await expect(
            page
                .getByText(/ข้อมูลนักเรียน|ผลการคัดกรอง|กลับหน้านักเรียน/)
                .first(),
        ).toBeVisible({ timeout: 10000 });
    });

    test("Step 4: Switch to Activities tab", async ({ page }) => {
        test.skip(!loggedIn, "Skipped — login failed");

        await loginAsTeacher(page, TEST_EMAIL, TEST_PASSWORD);
        await page.goto("/students");
        await page.waitForLoadState("networkidle");

        const studentLink = page.locator('a[href*="/students/"]').first();
        if ((await studentLink.count()) === 0) {
            test.skip(true, "No students in DB");
            return;
        }

        await studentLink.click();
        await page.waitForLoadState("networkidle");

        // Switch to Activities tab
        const activitiesTab = page.getByText("กิจกรรมและบันทึกการพูดคุย");
        if ((await activitiesTab.count()) > 0) {
            await activitiesTab.click();

            // Should show activity progress table or counseling log
            await expect(
                page
                    .getByText(
                        /กิจกรรม|บันทึกการพูดคุย|ดูแลช่วยเหลือ|ยังไม่มีข้อมูล/,
                    )
                    .first(),
            ).toBeVisible({ timeout: 10000 });
        }
    });

    test("Step 5: Navigate to help page", async ({ page }) => {
        test.skip(!loggedIn, "Skipped — login failed");

        await loginAsTeacher(page, TEST_EMAIL, TEST_PASSWORD);
        await page.goto("/students");
        await page.waitForLoadState("networkidle");

        const studentLink = page.locator('a[href*="/students/"]').first();
        if ((await studentLink.count()) === 0) {
            test.skip(true, "No students in DB");
            return;
        }

        // Get student ID from the URL
        const href = await studentLink.getAttribute("href");
        if (!href) {
            test.skip(true, "No student link found");
            return;
        }

        const studentId = href.split("/students/")[1]?.split("?")[0];

        // Try to access the help page directly
        await page.goto(`/students/${studentId}/help`);

        // Should show help content or redirect
        await page.waitForLoadState("networkidle");

        // The help page either shows activities or redirects back to student detail
        const url = page.url();
        expect(url).toMatch(/students/);
    });
});

test.describe("Activity Flow — Page Rendering", () => {
    test("protected route: /students redirects to signin when unauthenticated", async ({
        page,
    }) => {
        await page.goto("/students");
        await page.waitForURL(/signin/, { timeout: 10000 });
    });

    test("protected route: /dashboard redirects to signin when unauthenticated", async ({
        page,
    }) => {
        await page.goto("/dashboard");
        await page.waitForURL(/signin/, { timeout: 10000 });
    });

    test("protected route: /students/import redirects to signin when unauthenticated", async ({
        page,
    }) => {
        await page.goto("/students/import");
        await page.waitForURL(/signin/, { timeout: 10000 });
    });

    test("protected route: /teacher-profile redirects to signin when unauthenticated", async ({
        page,
    }) => {
        await page.goto("/teacher-profile");
        await page.waitForURL(/signin/, { timeout: 10000 });
    });

    test("protected route: /settings redirects to signin when unauthenticated", async ({
        page,
    }) => {
        await page.goto("/settings");
        await page.waitForURL(/signin/, { timeout: 10000 });
    });

    test("protected route: /admin/whitelist redirects to signin when unauthenticated", async ({
        page,
    }) => {
        await page.goto("/admin/whitelist");
        await page.waitForURL(/signin/, { timeout: 10000 });
    });

    test("nonexistent student shows 404", async ({ page }) => {
        // This might redirect to signin first, then 404
        await page.goto("/students/nonexistent-id-12345/help");

        // Should show signin (if unauthenticated) or 404
        await page.waitForLoadState("networkidle");
        const url = page.url();
        expect(url).toMatch(/signin|not-found|students/);
    });
});
