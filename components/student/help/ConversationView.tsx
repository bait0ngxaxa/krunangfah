"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    MessageCircle,
    ClipboardEdit,
    Hospital,
    ChevronRight,
} from "lucide-react";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { ColorTheme } from "@/lib/config/help-page-config";
import { HelpPageHeader } from "./HelpPageHeader";
import { AddCounselingModal } from "../counseling/AddCounselingModal";
import { ReferralFormModal } from "./ReferralFormModal";

interface ConversationViewProps {
    studentName: string;
    studentId: string;
    riskLevel: RiskLevel;
    config: ColorTheme;
    phqResultId?: string;
    initialReferralStatus?: boolean;
    initialHospitalName?: string;
}

interface StepCardProps {
    stepNumber: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    buttonLabel: string;
    onClick?: () => void;
    href?: string;
    gradient: string;
}

function StepCard({
    stepNumber,
    title,
    description,
    icon,
    buttonLabel,
    onClick,
    href,
    gradient,
}: StepCardProps) {
    const buttonClasses = `inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r ${gradient} text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm shadow-md group`;

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
                {/* Step Number Badge */}
                <div
                    className={`w-10 h-10 bg-linear-to-br ${gradient} rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md`}
                >
                    {stepNumber}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {icon}
                        <h3 className="text-lg font-bold text-gray-800">
                            {title}
                        </h3>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">{description}</p>

                    {href ? (
                        <Link href={href} className={buttonClasses}>
                            {buttonLabel}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onClick}
                            className={buttonClasses}
                        >
                            {buttonLabel}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ConversationView({
    studentName,
    studentId,
    riskLevel,
    config,
    phqResultId,
    initialReferralStatus,
    initialHospitalName,
}: ConversationViewProps) {
    const router = useRouter();
    const [showCounselingModal, setShowCounselingModal] = useState(false);
    const [showReferralModal, setShowReferralModal] = useState(false);
    const showRecordSteps = riskLevel === "red";

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Back Button */}
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-bold transition-all hover:bg-pink-50 px-4 py-2 rounded-full mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับหน้าข้อมูลนักเรียน</span>
                </Link>

                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/30 p-6 md:p-8 border border-white/60 ring-1 ring-pink-50 relative overflow-hidden animate-fade-in-up">
                    <div
                        className={`absolute top-0 left-0 w-full h-1.5 bg-linear-to-r ${config.gradient}`}
                    />

                    <HelpPageHeader
                        studentName={studentName}
                        config={config}
                        icon={
                            <MessageCircle className="w-10 h-10 text-white" />
                        }
                        title="ขั้นตอนการช่วยเหลือนักเรียน"
                    />

                    {/* 3-Step Workflow */}
                    <div className="space-y-4">
                        {/* Step 1: Conversation Guidelines */}
                        <StepCard
                            stepNumber={1}
                            title="พูดคุยเพื่อประเมินซ้ำ"
                            description="ดูหลักการและแนวทางในการพูดคุยกับนักเรียน"
                            icon={
                                <MessageCircle className="w-5 h-5 text-rose-500" />
                            }
                            buttonLabel="หลักการพูดคุย"
                            href={`/students/${studentId}/help/conversation`}
                            gradient={config.gradient}
                        />

                        {showRecordSteps && (
                            <>
                                {/* Step 2: Counseling Summary */}
                                <StepCard
                                    stepNumber={2}
                                    title="สรุปประเด็นการพูดคุย"
                                    description="บันทึกสรุปประเด็นที่พูดคุยกับนักเรียน"
                                    icon={
                                        <ClipboardEdit className="w-5 h-5 text-rose-500" />
                                    }
                                    buttonLabel="กรอกข้อมูล"
                                    onClick={() => setShowCounselingModal(true)}
                                    gradient={config.gradient}
                                />

                                {/* Step 3: Referral or Follow-up */}
                                <StepCard
                                    stepNumber={3}
                                    title="ส่งต่อโรงพยาบาล หรือ ติดตามต่อ"
                                    description="เลือกส่งต่อผู้เชี่ยวชาญ หรือติดตามดูแลต่อเนื่อง"
                                    icon={
                                        <Hospital className="w-5 h-5 text-rose-500" />
                                    }
                                    buttonLabel="กรอกข้อมูล"
                                    onClick={() => setShowReferralModal(true)}
                                    gradient={config.gradient}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Counseling Modal */}
            {showRecordSteps && showCounselingModal && (
                <AddCounselingModal
                    studentId={studentId}
                    onClose={() => setShowCounselingModal(false)}
                    onSuccess={() => router.refresh()}
                />
            )}

            {/* Referral Modal */}
            {showRecordSteps && showReferralModal && phqResultId && (
                <ReferralFormModal
                    phqResultId={phqResultId}
                    initialStatus={initialReferralStatus ?? false}
                    initialHospitalName={initialHospitalName}
                    onClose={() => setShowReferralModal(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </div>
    );
}
