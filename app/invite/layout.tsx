import { Providers } from "@/components/ui/Providers";

export default function InviteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Providers>{children}</Providers>;
}
