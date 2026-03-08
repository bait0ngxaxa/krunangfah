import { requireAuth } from "@/lib/session";
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
            <div className="pt-[80px]">{children}</div>
        </Providers>
    );
}
