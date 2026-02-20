"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useState } from "react";
import {
    Menu,
    X,
    LayoutDashboard,
    GraduationCap,
    BarChart3,
    Settings,
} from "lucide-react";

interface NavbarProps {
    hasStudents: boolean;
}

export function Navbar({ hasStudents }: NavbarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => pathname?.startsWith(path);

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

    // Filter links based on whether teacher has students
    const navLinks = allNavLinks.filter(
        (link) => !link.requiresStudents || hasStudents,
    );

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50"
            style={{ marginTop: "-48px" }}
        >
            {/* Green bar — finalized Figma spec */}
            <div
                className="w-full flex items-center"
                style={{
                    background: "#00DB87",
                    height: "120px",
                    borderRadius: "0px 0px 36px 45px",
                }}
            >
                {/* Logo — fills full navbar height, snug to bottom-left corner */}
                <div className="flex items-end h-full pl-0">
                    <Link
                        href="/dashboard"
                        className="flex items-end group h-full"
                    >
                        <Image
                            src="/image/homepage/icon 1.png"
                            alt="Kru Nangfah"
                            width={240}
                            height={120}
                            className="h-full w-auto object-contain"
                        />
                    </Link>
                </div>

                {/* Desktop Nav Links + Logout — right side */}
                <div className="flex items-center gap-2 ml-auto pr-6 sm:pr-10 lg:pr-16">
                    <div className="hidden md:flex md:space-x-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                                    isActive(link.href)
                                        ? "bg-white/25 text-white shadow-sm"
                                        : "text-white/80 hover:text-white hover:bg-white/15"
                                }`}
                            >
                                <link.icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="hidden md:block">
                        <LogoutButton variant="navbar" />
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 focus:outline-hidden transition-colors cursor-pointer"
                    >
                        <span className="sr-only">Open main menu</span>
                        {!isMobileMenuOpen ? (
                            <Menu className="block h-6 w-6" />
                        ) : (
                            <X className="block h-6 w-6" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-[#00DB87]/95 backdrop-blur-xl shadow-lg absolute w-full left-0 rounded-b-2xl">
                    <div className="px-3 pt-2 pb-3 space-y-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-semibold transition-colors ${
                                    isActive(link.href)
                                        ? "bg-white/25 text-white"
                                        : "text-white/80 hover:text-white hover:bg-white/15"
                                }`}
                            >
                                <link.icon className="w-5 h-5" />
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-2 mt-2 border-t border-white/20">
                            <LogoutButton variant="navbar" />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
