import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
    const session = await getServerSession();

    // If logged in, go to dashboard
    if (session?.user) {
        redirect("/dashboard");
    }

    // Not logged in - show landing page
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50">
            <div className="max-w-4xl w-full px-6 py-12 text-center">
                <h1 className="text-5xl md:text-6xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-6">
                    โครงการครูนางฟ้า
                </h1>

                <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
                    ระบบจัดการข้อมูลและติดตามผลโครงการครูนางฟ้า
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        href="/signin"
                        className="w-full sm:w-auto px-8 py-4 bg-linear-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg"
                    >
                        เข้าสู่ระบบ
                    </Link>

                    <Link
                        href="/signup"
                        className="w-full sm:w-auto px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                        ลงทะเบียน
                    </Link>
                </div>
            </div>
        </div>
    );
}
