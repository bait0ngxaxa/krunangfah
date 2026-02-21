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
 * - Height: 120px
 * - Border-radius: 0px 0px 36px 45px
 * - Top offset: -48px (hidden behind viewport top)
 * - Logo fills full height, snug to bottom-left corner
 */
export function NavbarGreenBar({
    logoHref = "/",
    fixed = false,
    children,
}: NavbarGreenBarProps) {
    return (
        <nav
            className={`${fixed ? "fixed top-0 left-0 right-0 z-50" : "relative z-20"}`}
            style={{
                marginTop: "-48px",
                paddingTop: "48px",
            }}
        >
            <div
                className="relative w-full flex items-center transition-all duration-300"
                style={{
                    background:
                        "linear-gradient(180deg, #00DB87 0%, #00C67A 100%)",
                    height: "120px",
                    borderRadius: "0px 0px 36px 45px",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    boxShadow:
                        "0 10px 30px -5px rgba(0, 219, 135, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                }}
            >
                {/* 3D Inner Highlight / Shadow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        borderRadius: "0px 0px 36px 45px",
                        boxShadow:
                            "inset 0 -3px 10px rgba(0, 0, 0, 0.1), inset 0 2px 10px rgba(255, 255, 255, 0.3)",
                    }}
                />
                {/* Logo — fills full navbar height */}
                <div className="flex items-end h-full pl-0">
                    <Link
                        href={logoHref}
                        className="flex items-end group h-full"
                    >
                        <Image
                            src="/image/homepage/icon 1.png"
                            alt="Kru Nangfah"
                            width={220}
                            height={120}
                            className="h-full w-auto object-contain"
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
