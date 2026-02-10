import { Suspense } from "react";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";

function NavbarFallback() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/40 shadow-sm shadow-pink-100/50 h-16" />
    );
}

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50">
            <Suspense fallback={<NavbarFallback />}>
                <NavbarWrapper />
            </Suspense>
            <main className="pt-16">{children}</main>
        </div>
    );
}
