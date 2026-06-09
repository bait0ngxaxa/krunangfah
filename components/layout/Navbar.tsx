"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useEffect, useState } from "react";
import {
    Menu,
    X,
    LayoutDashboard,
    GraduationCap,
    BarChart3,
    Settings,
} from "lucide-react";
import { NavbarGreenBar } from "./NavbarGreenBar";

interface NavbarProps {
    hasStudents: boolean;
}

export function Navbar({ hasStudents }: NavbarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => pathname?.startsWith(path);
    const mobileMenuId = "primary-mobile-navigation";

    const allNavLinks = [
        { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
        {
            href: "/students",
            label: "นักเรียนของฉัน",
            icon: GraduationCap,
            requiresStudents: true,
        },
        {
            href: "/analytics",
            label: "สรุปข้อมูล",
            icon: BarChart3,
            requiresStudents: true,
        },
        { href: "/settings", label: "ตั้งค่าบัญชี", icon: Settings },
    ];

    const navLinks = allNavLinks.filter(
        (link) => !link.requiresStudents || hasStudents,
    );

    useEffect(() => {
        if (!isMobileMenuOpen) {
            return;
        }

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isMobileMenuOpen]);

    return (
        <>
            <NavbarGreenBar logoHref="/dashboard" fixed>
                {/* Desktop Nav Links - moved to left next to logo */}
                <div className="ml-4 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:ml-8 md:flex [scrollbar-width:none]">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                                isActive(link.href)
                                    ? "bg-white/25 text-white shadow-sm"
                                    : "text-white/80 hover:text-white hover:bg-white/15"
                            }`}
                        >
                            <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="whitespace-nowrap">{link.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Right side - User Menu & Mobile Menu */}
                <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-transparent pr-4 sm:pr-10 lg:pr-16">
                    <div className="hidden items-center gap-3 md:flex xl:gap-4">
                        {/* Non-clickable avatar block */}
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-200 bg-[#FFE14D] p-1 shadow-sm lg:h-10 lg:w-10 lg:p-1.5">
                            <div className="relative h-full w-full">
                                <Image
                                    src="/image/logout.png"
                                    alt=""
                                    fill
                                    sizes="(max-width: 1024px) 36px, 40px"
                                    className="object-contain object-bottom"
                                />
                            </div>
                        </div>
                        <div className="mx-1 hidden h-8 w-px bg-white/30 lg:block" />
                        <LogoutButton variant="navbar" />
                    </div>

                    {/* Mobile menu button */}
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-controls={mobileMenuId}
                        aria-expanded={isMobileMenuOpen}
                        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg p-2 text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:hidden"
                    >
                        <span className="sr-only">
                            {isMobileMenuOpen
                                ? "ปิดเมนูหลัก"
                                : "เปิดเมนูหลัก"}
                        </span>
                        {!isMobileMenuOpen ? (
                            <Menu className="block h-6 w-6" aria-hidden="true" />
                        ) : (
                            <X className="block h-6 w-6" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </NavbarGreenBar>

            {/* Mobile Menu - Smooth slide animation */}
            <div
                id={mobileMenuId}
                className={`fixed left-0 right-0 top-[80px] z-[60] origin-top md:hidden ${
                    isMobileMenuOpen
                        ? "opacity-100 translate-y-0 scale-y-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-y-95 pointer-events-none"
                } motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out`}
                aria-hidden={!isMobileMenuOpen}
            >
                <div className="overflow-hidden rounded-b-2xl bg-[#00DB87] shadow-lg">
                    <div className="space-y-1 px-3 pb-3 pt-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                tabIndex={isMobileMenuOpen ? undefined : -1}
                                className={`flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold transition-colors duration-200 motion-safe:transition-transform motion-safe:hover:translate-x-1 ${
                                    isActive(link.href)
                                        ? "bg-white/25 text-white"
                                        : "text-white/80 hover:text-white hover:bg-white/15"
                                }`}
                            >
                                <link.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                                <span className="min-w-0 break-words">
                                    {link.label}
                                </span>
                            </Link>
                        ))}
                        <div className="mt-2 border-t border-white/20 pt-2">
                            <LogoutButton
                                variant="navbar"
                                tabIndex={isMobileMenuOpen ? undefined : -1}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
