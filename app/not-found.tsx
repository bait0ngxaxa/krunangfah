import Link from "next/link";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPinOff className="w-10 h-10 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    ไม่พบหน้าที่ต้องการ
                </h2>
                <p className="text-gray-600 mb-6">
                    ขออภัย หน้าที่คุณกำลังมองหาไม่มีอยู่ในระบบ
                    หรืออาจถูกย้ายไปแล้ว
                </p>
                <div className="flex gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-base shadow-md hover:shadow-lg font-medium"
                    >
                        กลับ Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
