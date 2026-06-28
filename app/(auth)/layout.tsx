import { Providers } from "@/components/ui/Providers";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Providers rotateSession={false}>{children}</Providers>;
}
