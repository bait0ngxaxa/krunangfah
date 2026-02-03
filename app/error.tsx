"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Page error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-4xl">😕</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    เกิดข้อผิดพลาด
                </h2>
                <p className="text-gray-600 mb-6">
                    ขออภัย ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง
                </p>
                {error.message && (
                    <p className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg font-mono text-left overflow-auto max-h-32">
                        {error.message}
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                    <a
                        href="/dashboard"
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                    >
                        กลับ Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
