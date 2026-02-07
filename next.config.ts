import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // 1. จับ bugs ใน development (double render check)
    reactStrictMode: true,

    // 2. Security: ซ่อน header "X-Powered-By: Next.js"
    poweredByHeader: false,

    experimental: {
        serverActions: {
            bodySizeLimit: "10mb", // เพิ่ม limit เป็น 10MB สำหรับอัปโหลดไฟล์
        },
        // 3. Tree shaking สำหรับ libraries ขนาดใหญ่
        optimizePackageImports: [
            "lucide-react",
            "recharts",
            "sonner",
            "exceljs",
            "react-hook-form",
            "@hookform/resolvers",
        ],
        // 4. Router cache สำหรับ dynamic/static pages
        staleTimes: {
            dynamic: 30, // cache dynamic pages 30 วินาที
            static: 180, // cache static pages 3 นาที
        },
    },

    // 6. รองรับ image formats ที่เล็กกว่า + responsive sizes
    images: {
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    // 5. Node.js-only packages (ไม่ bundle ไป client)
    serverExternalPackages: ["bcryptjs"],

    // Enable gzip compression
    compress: true,
    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: "/(.*)",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
