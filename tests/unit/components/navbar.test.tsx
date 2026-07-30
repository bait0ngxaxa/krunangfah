// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/layout/Navbar";

const navigation = vi.hoisted(() => ({
    pathname: "/admin/system",
}));

vi.mock("next/navigation", () => ({
    usePathname: () => navigation.pathname,
}));

vi.mock("next/link", () => ({
    default: ({
        children,
        href,
        ...props
    }: { children: ReactNode; href: string } & Record<string, unknown>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

vi.mock("next/image", () => ({
    default: ({
        fill: _fill,
        priority: _priority,
        ...props
    }: ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => (
        <img {...props} />
    ),
}));

function renderNavbar(pathname = "/admin/system"): void {
    navigation.pathname = pathname;
    render(<Navbar hasStudents />);
}

describe("Navbar responsive navigation", () => {
    beforeEach(() => {
        navigation.pathname = "/admin/system";
    });

    it("keeps the mobile menu through tablet widths and removes primary-nav scrolling", () => {
        renderNavbar();

        const primaryNav = screen.getByRole("link", { name: "หน้าหลัก" })
            .parentElement;
        const mobileMenuButton = screen.getByRole("button", {
            name: "เปิดเมนูหลัก",
        });

        expect(primaryNav?.className).toContain("lg:flex");
        expect(primaryNav?.className).not.toContain("md:flex");
        expect(primaryNav?.className).not.toContain("overflow-x-auto");
        expect(mobileMenuButton.className).toContain("lg:hidden");
        expect(mobileMenuButton.className).not.toContain("md:hidden");
    });

    it("shows path context without a role-based management menu", () => {
        renderNavbar("/admin/data-management");

        expect(
            screen.queryByRole("button", { name: "การจัดการ" }),
        ).toBeNull();
        expect(screen.getAllByText("ศูนย์ดูแลระบบ").length).toBeGreaterThan(0);
        expect(screen.queryByRole("link", { name: "จัดการครู" })).toBeNull();

        cleanup();
        renderNavbar("/teachers/add");
        expect(screen.getAllByText("จัดการครู").length).toBeGreaterThan(0);
    });

    it("places logout inside the desktop account dropdown", async () => {
        const user = userEvent.setup();
        renderNavbar();

        expect(screen.queryByRole("button", { name: "ออกจากระบบ" })).toBeNull();

        await user.click(
            screen.getByRole("button", { name: "เปิดเมนูบัญชี" }),
        );

        const accountPopup = screen.getByRole("group", {
            name: "เมนูบัญชีผู้ใช้",
        });
        const logoutButton = screen.getByRole("button", {
            name: "ออกจากระบบ",
        });

        expect(accountPopup).toBeTruthy();
        expect(accountPopup.className).toContain("rounded-2xl");
        expect(logoutButton.className).toContain("w-full");
    });
});
