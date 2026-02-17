/**
 * E2E Test: Public Pages
 *
 * Tests that public pages load correctly without authentication.
 */

import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
    test("homepage loads with branding", async ({ page }) => {
        await page.goto("/");

        // Should show the project name
        await expect(page.getByText("โครงการครูนางฟ้า").first()).toBeVisible();

        // Should have link to sign in
        await expect(
            page.getByRole("link", { name: /เข้าสู่ระบบ|Sign in/i }),
        ).toBeVisible();
    });

    test("homepage → signin navigation", async ({ page }) => {
        await page.goto("/");

        await page.getByRole("link", { name: /เข้าสู่ระบบ|Sign in/i }).click();
        await page.waitForURL(/signin/);
    });

    test("invite page with invalid token shows error", async ({ page }) => {
        await page.goto("/invite/invalid-token-12345");

        // Should show error or 404 message
        await expect(
            page.getByText(/ไม่พบ|หมดอายุ|ไม่ถูกต้อง|not found/i).first(),
        ).toBeVisible({ timeout: 10000 });
    });
});
