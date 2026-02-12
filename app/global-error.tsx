"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global error:", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">
                            เกิดข้อผิดพลาด
                        </h2>
                        <p className="text-gray-600 mb-6">
                            ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด
                            กรุณาลองใหม่อีกครั้ง
                        </p>
                        {error.digest && (
                            <p className="text-xs text-gray-400 mb-4 font-mono">
                                Error ID: {error.digest}
                            </p>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={reset}
                                className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg font-medium"
                            >
                                ลองใหม่อีกครั้ง
                            </button>
                            <Link
                                href="/"
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                            >
                                กลับหน้าหลัก
                            </Link>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
