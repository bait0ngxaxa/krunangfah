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
                marginTop: "-48px",
                height: "120px",
                background: "#00DB87",
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

    // Onboarding guard: check DB directly (no stale JWT issues)
    if (session.user.role !== "system_admin") {
        if (!session.user.schoolId) {
            redirect("/school-setup");
        }

        const teacherProfile = await prisma.teacher.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        });

        if (!teacherProfile) {
            redirect("/teacher-profile");
        }
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50/30 via-white to-teal-50/20">
            <Suspense fallback={<NavbarFallback />}>
                <NavbarWrapper />
            </Suspense>
            <main className="pt-[72px]">{children}</main>
        </div>
    );
}
