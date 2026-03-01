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
import { NavbarGreenBar } from "./NavbarGreenBar";

// Add these animation styles to your global CSS or tailwind config
// @keyframes slideDown {
//   from { opacity: 0; transform: translateY(-10px) scaleY(0.95); }
//   to { opacity: 1; transform: translateY(0) scaleY(1); }
// }
// .animate-slideDown { animation: slideDown 0.25s ease-out forwards; }
// .animate-slideUp { animation: slideDown 0.2s ease-in reverse forwards; }

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

    const navLinks = allNavLinks.filter(
        (link) => !link.requiresStudents || hasStudents,
    );

    return (
        <>
            <NavbarGreenBar logoHref="/dashboard" fixed>
                {/* Desktop Nav Links - moved to left next to logo */}
                <div className="hidden md:flex flex-1 items-center ml-4 lg:ml-8 gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
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

                {/* Right side - User Menu & Mobile Menu */}
                <div className="flex items-center gap-3 ml-auto pr-6 sm:pr-10 lg:pr-16 shrink-0 border-l border-transparent">
                    <div className="hidden md:flex items-center gap-3 xl:gap-4">
                        {/* Non-clickable avatar block */}
                        <div className="relative w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#FFE14D] shrink-0 overflow-hidden shadow-sm border border-yellow-200 flex items-center justify-center p-1 lg:p-1.5">
                            <div className="relative w-full h-full">
                                <Image
                                    src="/image/logout.png"
                                    alt="User Profile"
                                    fill
                                    className="object-contain object-bottom"
                                />
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/30 hidden lg:block mx-1" />
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
            </NavbarGreenBar>

            {/* Mobile Menu - Smooth slide animation */}
            <div
                className={`md:hidden fixed top-[80px] left-0 right-0 z-60 transition-all duration-300 ease-out transform origin-top ${
                    isMobileMenuOpen
                        ? "opacity-100 translate-y-0 scale-y-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-y-95 pointer-events-none"
                }`}
            >
                <div className="bg-[#00DB87] shadow-lg rounded-b-2xl overflow-hidden">
                    <div className="px-3 pt-2 pb-3 space-y-1">
                        {navLinks.map((link, index) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-semibold transition-all duration-200 hover:translate-x-1 ${
                                    isActive(link.href)
                                        ? "bg-white/25 text-white"
                                        : "text-white/80 hover:text-white hover:bg-white/15"
                                }`}
                                style={{
                                    transitionDelay: isMobileMenuOpen
                                        ? `${index * 50}ms`
                                        : "0ms",
                                }}
                            >
                                <link.icon className="w-5 h-5" />
                                {link.label}
                            </Link>
                        ))}
                        <div
                            className="pt-2 mt-2 border-t border-white/20 transition-all duration-200"
                            style={{
                                transitionDelay: isMobileMenuOpen
                                    ? `${navLinks.length * 50}ms`
                                    : "0ms",
                            }}
                        >
                            <LogoutButton variant="navbar" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
