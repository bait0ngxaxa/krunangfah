"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface NavbarProps {
    hasStudents: boolean;
}

export function Navbar({ hasStudents }: NavbarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => pathname?.startsWith(path);

    const allNavLinks = [
        { href: "/dashboard", label: "หน้าหลัก" },
        { href: "/students", label: "นักเรียนของฉัน", requiresStudents: true },
    ];

    // Filter links based on whether teacher has students
    const navLinks = allNavLinks.filter(
        (link) => !link.requiresStudents || hasStudents,
    );

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-pink-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo & Brand */}
                    <div className="flex items-center">
                        <Link
                            href="/dashboard"
                            className="shrink-0 flex items-center gap-2"
                        >
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold shadow-sm">
                                🧚‍♀️
                            </div>
                            <span className="font-bold text-xl bg-linear-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                                Kru Nangfah
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:ml-10 md:flex md:space-x-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                        isActive(link.href)
                                            ? "bg-pink-50 text-pink-600 shadow-sm ring-1 ring-pink-200"
                                            : "text-gray-600 hover:text-pink-500 hover:bg-pink-50/50"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Logout & Mobile Menu Button */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block">
                            <LogoutButton />
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() =>
                                setIsMobileMenuOpen(!isMobileMenuOpen)
                            }
                            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-pink-500 hover:bg-pink-50 focus:outline-hidden"
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
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-pink-50 shadow-lg absolute w-full left-0">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                                    isActive(link.href)
                                        ? "bg-pink-50 text-pink-600"
                                        : "text-gray-600 hover:text-pink-500 hover:bg-pink-50/50"
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-2 mt-2 border-t border-gray-100">
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
