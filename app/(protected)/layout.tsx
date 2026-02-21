import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function NavbarFallback() {
    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50"
            style={{
                background: "#00DB87",
                height: "120px",
                borderRadius: "0px 0px 36px 45px",
            }}
        />
    );
}

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await requireAuth();

    // Onboarding guard: check DB directly (JWT may be stale)
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
        <div className="min-h-screen">
            <Suspense fallback={<NavbarFallback />}>
                <NavbarWrapper />
            </Suspense>
            <main className="pt-[120px]">{children}</main>
        </div>
    );
}
