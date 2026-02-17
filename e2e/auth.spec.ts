/**
 * E2E Test: Authentication Flow
 *
 * Tests login, signup link navigation, and protected route redirect.
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
    test("signin page loads correctly", async ({ page }) => {
        await page.goto("/signin");

        // Page title
        await expect(page).toHaveTitle(/เข้าสู่ระบบ/);

        // Form elements exist
        await expect(page.locator("#email")).toBeVisible();
        await expect(page.locator("#password")).toBeVisible();
        await expect(
            page.getByRole("button", { name: "เข้าสู่ระบบ" }),
        ).toBeVisible();

        // Links
        await expect(page.getByText("ลงทะเบียน")).toBeVisible();
        await expect(page.getByText("ลืมรหัสผ่าน?")).toBeVisible();
    });

    test("shows validation error for empty fields", async ({ page }) => {
        await page.goto("/signin");

        // Submit without filling anything
        await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

        // Should show validation errors (Zod messages via react-hook-form)
        await expect(page.locator("text=กรุณากรอก").first()).toBeVisible({
            timeout: 3000,
        });
    });

    test("shows error for invalid credentials", async ({ page }) => {
        await page.goto("/signin");

        await page.locator("#email").fill("wrong@email.com");
        await page.locator("#password").fill("WrongPassword123!");
        await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

        // Should show error toast or message
        await expect(page.getByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeVisible(
            { timeout: 10000 },
        );
    });

    test("redirects unauthenticated user from protected route", async ({
        page,
    }) => {
        await page.goto("/dashboard");

        // Should redirect to signin
        await page.waitForURL(/signin/, { timeout: 10000 });
        await expect(page.locator("#email")).toBeVisible();
    });

    test("signup page loads correctly", async ({ page }) => {
        await page.goto("/signup");

        await expect(page).toHaveTitle(/ลงทะเบียน|สมัคร/);
        await expect(page.locator("#email")).toBeVisible();
        await expect(page.locator("#password")).toBeVisible();
    });

    test("forgot password page loads correctly", async ({ page }) => {
        await page.goto("/forgot-password");

        await expect(page.locator("#email")).toBeVisible();
        await expect(
            page.getByRole("button", { name: /ส่ง|รีเซ็ต/ }),
        ).toBeVisible();
    });

    test("signin → signup link navigation", async ({ page }) => {
        await page.goto("/signin");

        await page.getByText("ลงทะเบียน").click();
        await page.waitForURL(/signup/);
        await expect(page.locator("#email")).toBeVisible();
    });

    test("signin → forgot password link navigation", async ({ page }) => {
        await page.goto("/signin");

        await page.getByText("ลืมรหัสผ่าน?").click();
        await page.waitForURL(/forgot-password/);
    });
});
