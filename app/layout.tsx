import type { Metadata } from "next";
import localFont from "next/font/local";
import { ToasterProvider } from "@/components/ui/ToasterProvider";
import "./globals.css";

const googleSans = localFont({
    src: "../public/fonts/GoogleSans-VariableFont.ttf",
    variable: "--font-google-sans",
    display: "swap",
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
                {children}
                <ToasterProvider />
            </body>
        </html>
    );
}
