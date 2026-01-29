import { NavbarWrapper } from "@/components/layout/NavbarWrapper";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50">
            <NavbarWrapper />
            <main className="pt-16">{children}</main>
        </div>
    );
}
