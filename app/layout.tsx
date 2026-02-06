import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
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
        <html lang="en">
            <body className={`${googleSans.variable} antialiased`}>
                {children}
                <Toaster
                    position="top-center"
                    richColors
                    expand={true}
                    closeButton
                    toastOptions={{
                        className: "font-sans",
                        style: {
                            borderRadius: "12px",
                            padding: "16px",
                            fontFamily:
                                "var(--font-google-sans), system-ui, -apple-system, sans-serif",
                        },
                    }}
                />
            </body>
        </html>
    );
}
