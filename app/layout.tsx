import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToasterProvider } from "@/components/ui/ToasterProvider";
import { Providers } from "@/components/ui/Providers";
import "./globals.css";

// Google Sans Variable Font - รองรับ weights 100-900 ทั้งหมด
const googleSans = localFont({
    src: "../public/fonts/GoogleSans-VariableFont.woff2",
    variable: "--font-google-sans",
    display: "swap",
    weight: "100 900", // Variable font รองรับทุก weight
    preload: true,
    fallback: ["system-ui", "-apple-system", "sans-serif"],
});

export const metadata: Metadata = {
    title: "ครูนางฟ้า - ระบบช่วยเหลือนักเรียน",
    description:
        "ระบบบริหารจัดการและช่วยเหลือนักเรียนแบบครบวงจร สำหรับครูและสถาบันการศึกษา",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="th" suppressHydrationWarning>
            <body className={`${googleSans.variable} antialiased`}>
                <Providers>
                    {children}
                    <ToasterProvider />
                </Providers>
            </body>
        </html>
    );
}
