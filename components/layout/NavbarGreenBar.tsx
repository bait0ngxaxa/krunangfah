import Image from "next/image";
import Link from "next/link";

interface NavbarGreenBarProps {
    /** Where the logo links to. Defaults to "/" */
    logoHref?: string;
    /** Whether this navbar is fixed (used inside layouts). Defaults to false (relative, for standalone pages) */
    fixed?: boolean;
    /** Content to render on the right side of the navbar (nav links, logout, text, etc.) */
    children?: React.ReactNode;
}

/**
 * Shared green navbar bar used across the entire project.
 * Provides the green div + logo. Each page/layout passes its own right-side content as children.
 *
 * Design spec (Figma):
 * - Background: #00DB87
 * - Height: 80px
 * - Border-radius: 0px 0px 24px 30px
 * - Top offset: -24px (hidden behind viewport top)
 * - Logo fills full height, snug to bottom-left corner
 */
export function NavbarGreenBar({
    logoHref = "/",
    fixed = false,
    children,
}: NavbarGreenBarProps) {
    return (
        <nav
            aria-label="เมนูหลัก"
            className={`${fixed ? "fixed left-0 right-0 top-0 z-[50]" : "relative z-20"}`}
            style={{
                marginTop: "-24px",
                paddingTop: "24px",
            }}
        >
            <div
                className="relative flex w-full min-w-0 items-center motion-safe:transition-shadow motion-safe:duration-300"
                style={{
                    background:
                        "linear-gradient(180deg, #00DB87 0%, #00C67A 100%)",
                    height: "80px",
                    borderRadius: "0px 0px 24px 30px",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    boxShadow:
                        "0 10px 30px -5px rgba(0, 219, 135, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                }}
            >
                {/* 3D Inner Highlight / Shadow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        borderRadius: "0px 0px 24px 26px",
                        boxShadow:
                            "inset 0 -3px 10px rgba(0, 0, 0, 0.1), inset 0 2px 10px rgba(255, 255, 255, 0.3)",
                    }}
                />
                {/* Logo — fills full navbar height */}
                <div className="flex h-full shrink-0 items-end pl-0">
                    <Link
                        href={logoHref}
                        className="group flex h-full items-end rounded-br-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-500"
                        aria-label="ไปหน้าหลัก"
                    >
                        <Image
                            src="/image/homepage/icon 1.png"
                            alt="ครูนางฟ้า"
                            width={160}
                            height={80}
                            className="h-full w-auto object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.02]"
                            priority
                        />
                    </Link>
                </div>

                {/* Right-side content (varies per page) */}
                {children}
            </div>
        </nav>
    );
}
