import { requireAuth } from "@/lib/auth/session";
import { SecuritySettingsForm } from "@/components/settings/SecuritySettingsForm/SecuritySettingsForm";
import { SessionManagementPanel } from "@/components/settings/SessionManagementPanel";
import { SchoolGeneralInfoForm } from "@/components/settings/SchoolGeneralInfoForm";
import { TeacherGeneralInfoForm } from "@/components/settings/TeacherGeneralInfoForm";
import { listMySessions } from "@/lib/actions/session-management.actions";
import { getMySchoolInfo } from "@/lib/actions/school-info.actions";
import { getMyTeacherGeneralInfo } from "@/lib/actions/teacher-general-info.actions";
import { Building2, Lock, ShieldCheck, UserRoundPen } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ตั้งค่าบัญชี | ครูนางฟ้า",
    description: "เปลี่ยนรหัสผ่านของคุณ",
};

export default async function SettingsPage() {
    const session = await requireAuth();
    const canEditSchool =
        session.user.role === "school_admin" && session.user.isPrimary === true;
    const [sessionResult, school, teacher] = await Promise.all([
        listMySessions(),
        canEditSchool ? getMySchoolInfo() : Promise.resolve(null),
        getMyTeacherGeneralInfo(),
    ]);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        ตั้งค่าบัญชี
                    </h1>
                    <p className="text-gray-600 mt-2">
                        จัดการข้อมูลบัญชีและการตั้งค่าที่คุณรับผิดชอบ
                    </p>
                </div>

                {teacher && (
                    <section
                        id="teacher-general-information"
                        className="mb-8 rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm sm:p-8"
                    >
                        <div className="mb-6 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--brand-primary)] bg-white text-[var(--brand-primary)]">
                                <UserRoundPen className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    ข้อมูลทั่วไปของครู
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    แก้ไขข้อมูลส่วนตัวและบทบาทการทำงาน โดยไม่เปลี่ยนประเภทบัญชีหรือชั้นที่ปรึกษา
                                </p>
                            </div>
                        </div>
                        <TeacherGeneralInfoForm teacher={teacher} />
                    </section>
                )}

                {school && (
                    <section
                        id="school-information"
                        className="mb-8 rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm sm:p-8"
                    >
                        <div className="mb-6 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--brand-primary)] bg-white text-[var(--brand-primary)]">
                                <Building2 className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    ข้อมูลทั่วไปของโรงเรียน
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    ข้อมูลนี้จะแสดงในหน้าสรุปและส่วนที่อ้างอิงโรงเรียน
                                </p>
                            </div>
                        </div>
                        <SchoolGeneralInfoForm school={school} />
                    </section>
                )}

                {/* Password Change */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            เปลี่ยนรหัสผ่าน
                        </h2>
                    </div>
                    <SecuritySettingsForm />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8 mt-8">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldCheck className="w-5 h-5 text-gray-700" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            ข้อมูล session
                        </h2>
                    </div>
                    <SessionManagementPanel
                        initialSessions={sessionResult.sessions}
                    />
                </div>
            </div>
        </div>
    );
}
