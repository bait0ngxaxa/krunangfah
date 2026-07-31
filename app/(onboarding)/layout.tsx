import { requireAuth } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NavbarGreenBar } from "@/components/layout/NavbarGreenBar";
import { Providers } from "@/components/ui/Providers";

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAuth();

    return (
        <Providers>
            <NavbarGreenBar fixed>
                {/* Right side — logout */}
                <div className="ml-auto pr-6 sm:pr-10 lg:pr-16">
                    <LogoutButton variant="navbar" />
                </div>
            </NavbarGreenBar>
            {/* pt = full navbar height */}
            <main id="main-content" tabIndex={-1} className="pt-[80px]">
                {children}
            </main>
        </Providers>
    );
}
