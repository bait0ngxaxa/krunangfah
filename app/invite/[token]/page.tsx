import { getTeacherInvite } from "@/lib/actions/teacher-invite.actions";
import { AcceptInviteForm } from "@/components/teacher/AcceptInviteForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลงทะเบียนครูผู้ดูแล | โครงการครูนางฟ้า",
    description: "ลงทะเบียนเข้าใช้งานระบบ",
};

interface InvitePageProps {
    params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;
    const result = await getTeacherInvite(token);

    if (!result.success || !result.invite) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-8 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">
                        ลิงก์ไม่ถูกต้อง
                    </h1>
                    <p className="text-gray-600 mb-6">{result.message}</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-8 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        ยินดีต้อนรับสู่โครงการครูนางฟ้า
                    </h1>
                    <p className="text-gray-600 mt-2">
                        กรุณาตั้งรหัสผ่านเพื่อเข้าใช้งานระบบ
                    </p>
                </div>
                <AcceptInviteForm token={token} inviteData={result.invite} />
            </div>
        </div>
    );
}
