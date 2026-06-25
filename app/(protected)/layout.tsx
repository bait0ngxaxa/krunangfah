import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Providers } from "@/components/ui/Providers";
import { Skeleton } from "@/components/ui/Skeleton";

function NavbarFallback() {
    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white px-4 py-4 shadow-sm"
            role="status"
            aria-label="กำลังโหลดแถบนำทาง"
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                <Skeleton className="h-11 w-44 rounded-full" />
                <div className="hidden items-center gap-3 sm:flex">
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
        </nav>
    );
}

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireAuth();

    // Onboarding guard: check DB directly so claims stay current.
    if (session.user.role !== "system_admin") {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                teacher: { select: { id: true } },
            },
        });

        if (!dbUser?.teacher) {
            redirect("/teacher-profile");
        }

        if (!dbUser?.schoolId) {
            redirect("/school-setup");
        }
    }

    return (
        <Providers>
            <div className="min-h-screen">
                <Suspense fallback={<NavbarFallback />}>
                    <NavbarWrapper />
                </Suspense>
                <main className="pt-[80px]">{children}</main>
            </div>
        </Providers>
    );
}
