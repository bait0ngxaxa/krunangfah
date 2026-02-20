import Image from "next/image";
import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth check only — onboarding pages handle their own redirect logic
    await requireAuth();

    return (
        <>
            <nav
                className="fixed top-0 left-0 right-0 z-50"
                style={{ marginTop: "-48px" }}
            >
                <div
                    className="w-full flex items-center"
                    style={{
                        background: "#00DB87",
                        height: "120px",
                        borderRadius: "0px 0px 36px 45px",
                    }}
                >
                    {/* Logo — fills full navbar height */}
                    <div className="flex items-end h-full pl-0">
                        <Link href="/" className="flex items-end group h-full">
                            <Image
                                src="/image/homepage/icon 1.png"
                                alt="Kru Nangfah"
                                width={240}
                                height={120}
                                className="h-full w-auto object-contain"
                            />
                        </Link>
                    </div>
                    {/* Right side — logout */}
                    <div className="ml-auto pr-6 sm:pr-10 lg:pr-16">
                        <LogoutButton variant="navbar" />
                    </div>
                </div>
            </nav>
            {/* pt = 120px - 48px = 72px visible navbar height */}
            <div className="pt-[72px]">{children}</div>
        </>
    );
}
