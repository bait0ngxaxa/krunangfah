"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    BarChart3,
    ChevronDown,
    GraduationCap,
    LayoutDashboard,
    Menu,
    School,
    Settings,
    ShieldCheck,
    UserPlus,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavbarGreenBar } from "./NavbarGreenBar";

interface NavbarProps {
    hasStudents: boolean;
    hasQueryError?: boolean;
}

interface NavigationLink {
    href: string;
    label: string;
    icon: LucideIcon;
    requiresStudents?: boolean;
}

interface NavigationContext {
    path: string;
    label: string;
    icon: LucideIcon;
}

const mobileMenuId = "primary-mobile-navigation";
const accountMenuId = "account-navigation-menu";

const primaryNavLinks: readonly NavigationLink[] = [
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

const navigationContexts: readonly NavigationContext[] = [
    { path: "/admin", label: "ศูนย์ดูแลระบบ", icon: ShieldCheck },
    { path: "/teachers/add", label: "จัดการครู", icon: UserPlus },
    { path: "/teachers/skill", label: "พัฒนาทักษะ", icon: GraduationCap },
    { path: "/teachers", label: "ส่วนของครู", icon: GraduationCap },
    { path: "/school", label: "จัดการโรงเรียน", icon: School },
];

function matchesPath(pathname: string | null, path: string): boolean {
    return pathname === path || pathname?.startsWith(`${path}/`) === true;
}

function getNavigationContext(
    pathname: string | null,
): NavigationContext | null {
    return (
        navigationContexts.find((context) =>
            matchesPath(pathname, context.path),
        ) ?? null
    );
}

export function Navbar({
    hasStudents,
    hasQueryError = false,
}: NavbarProps): React.ReactElement {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const accountMenuRef = useRef<HTMLDivElement>(null);
    const accountMenuButtonRef = useRef<HTMLButtonElement>(null);

    const closeMobileMenu = useCallback((): void => {
        const mobileMenu = document.getElementById(mobileMenuId);
        if (mobileMenu?.contains(document.activeElement)) {
            mobileMenuButtonRef.current?.focus();
        }
        setIsMobileMenuOpen(false);
    }, []);

    const navLinks = primaryNavLinks.filter(
        (link) => !link.requiresStudents || hasStudents,
    );
    const navigationContext = getNavigationContext(pathname);
    const NavigationContextIcon = navigationContext?.icon;
    const isActive = (link: NavigationLink): boolean =>
        matchesPath(pathname, link.href);

    useEffect(() => {
        if (!isMobileMenuOpen && !isAccountMenuOpen) {
            return;
        }

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") {
                return;
            }

            if (isAccountMenuOpen) {
                setIsAccountMenuOpen(false);
                accountMenuButtonRef.current?.focus();
                return;
            }

            if (isMobileMenuOpen) {
                closeMobileMenu();
            }
        };

        const handlePointerDown = (event: PointerEvent): void => {
            if (!(event.target instanceof Node)) {
                return;
            }

            if (
                isAccountMenuOpen &&
                !accountMenuRef.current?.contains(event.target)
            ) {
                setIsAccountMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        document.addEventListener("pointerdown", handlePointerDown);
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [
        closeMobileMenu,
        isAccountMenuOpen,
        isMobileMenuOpen,
    ]);

    return (
        <>
            <NavbarGreenBar logoHref="/dashboard" fixed>
                {hasQueryError && (
                    <span className="hidden rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 sm:inline">
                        โหลดสถานะข้อมูลไม่สำเร็จ
                    </span>
                )}
                {/* Desktop Nav Links - moved to left next to logo */}
                <div className="ml-4 hidden min-w-0 flex-1 items-center gap-1 lg:ml-8 lg:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={isActive(link) ? "page" : undefined}
                            className={`flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2.5 py-2.5 text-sm font-semibold transition-colors duration-200 lg:px-3 xl:px-4 ${
                                isActive(link)
                                    ? "bg-white/25 text-white shadow-sm"
                                    : "text-white/80 hover:text-white hover:bg-white/15"
                            }`}
                        >
                            <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="whitespace-nowrap">{link.label}</span>
                        </Link>
                    ))}

                    {navigationContext && NavigationContextIcon && (
                        <div
                            className="hidden min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white lg:flex"
                            aria-label={`ส่วนปัจจุบัน: ${navigationContext.label}`}
                            aria-current="page"
                        >
                            <NavigationContextIcon
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span className="whitespace-nowrap">
                                {navigationContext.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right side - User Menu & Mobile Menu */}
                <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-transparent pr-4 sm:pr-10 lg:pr-8 xl:pr-16">
                    <div
                        ref={accountMenuRef}
                        className="relative hidden h-full items-center lg:flex"
                    >
                        <button
                            ref={accountMenuButtonRef}
                            type="button"
                            onClick={() => {
                                setIsAccountMenuOpen((isOpen) => !isOpen);
                            }}
                            aria-label={
                                isAccountMenuOpen
                                    ? "ปิดเมนูบัญชี"
                                    : "เปิดเมนูบัญชี"
                            }
                            aria-controls={accountMenuId}
                            aria-expanded={isAccountMenuOpen}
                            aria-haspopup="true"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg p-1 text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-200 bg-[#FFE14D] p-1 shadow-sm">
                            <div className="relative h-full w-full">
                                <Image
                                    src="/image/logout.png"
                                    alt=""
                                    fill
                                    sizes="(max-width: 1024px) 36px, 40px"
                                    className="object-contain object-bottom"
                                />
                            </div>
                            </span>
                            <ChevronDown
                                className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${
                                    isAccountMenuOpen ? "rotate-180" : ""
                                }`}
                                aria-hidden="true"
                            />
                        </button>

                        {isAccountMenuOpen && (
                            <div
                                id={accountMenuId}
                                className="absolute right-0 top-full z-[70] mt-2 w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white text-gray-700 shadow-md"
                                aria-label="เมนูบัญชีผู้ใช้"
                                role="group"
                            >
                                <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/70 px-4 py-3">
                                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-200 bg-[#FFE14D] p-1 shadow-sm">
                                        <span className="relative h-full w-full">
                                            <Image
                                                src="/image/logout.png"
                                                alt=""
                                                fill
                                                sizes="36px"
                                                className="object-contain object-bottom"
                                            />
                                        </span>
                                    </span>
                                    <p className="text-sm font-bold text-emerald-900">
                                        บัญชีผู้ใช้
                                    </p>
                                </div>
                                <div className="p-2">
                                    <LogoutButton variant="navbar-dropdown" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        ref={mobileMenuButtonRef}
                        type="button"
                        onClick={() => {
                            if (isMobileMenuOpen) {
                                closeMobileMenu();
                                return;
                            }
                            setIsMobileMenuOpen(true);
                        }}
                        aria-controls={mobileMenuId}
                        aria-expanded={isMobileMenuOpen}
                        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg p-2 text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
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
                className={`fixed left-0 right-0 top-[80px] z-[60] origin-top lg:hidden ${
                    isMobileMenuOpen
                        ? "opacity-100 translate-y-0 scale-y-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-y-95 pointer-events-none"
                } motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out`}
                aria-hidden={!isMobileMenuOpen}
                inert={!isMobileMenuOpen}
            >
                <div className="overflow-hidden rounded-b-2xl bg-[#00DB87] shadow-lg">
                    <div className="space-y-1 px-3 pb-3 pt-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMobileMenu}
                                aria-current={
                                    isActive(link) ? "page" : undefined
                                }
                                tabIndex={isMobileMenuOpen ? undefined : -1}
                                className={`flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold transition-colors duration-200 motion-safe:transition-transform motion-safe:hover:translate-x-1 ${
                                    isActive(link)
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

                        {navigationContext && NavigationContextIcon && (
                            <div
                                className="mt-2 flex items-center gap-2 border-t border-white/20 px-4 pb-1 pt-3 text-sm font-semibold text-white"
                                aria-current="page"
                            >
                                <NavigationContextIcon
                                    className="h-5 w-5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 break-words">
                                    ส่วนปัจจุบัน: {navigationContext.label}
                                </span>
                            </div>
                        )}

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
