"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    MessageCircle,
    ClipboardEdit,
    Hospital,
    ChevronRight,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
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
    bgClass: string;
}

function StepCard({
    stepNumber,
    title,
    description,
    icon,
    buttonLabel,
    onClick,
    href,
    bgClass,
}: StepCardProps) {
    const buttonClasses = `inline-flex items-center gap-2 px-6 py-3 ${bgClass} text-white rounded-xl font-bold hover:shadow-md hover:-translate-y-0.5 transition-all text-sm shadow-sm group`;

    return (
        <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
                {/* Step Number Badge */}
                <div
                    className={`w-10 h-10 ${bgClass} rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm`}
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
        <div className="min-h-screen bg-slate-50 py-8 px-4 relative overflow-hidden">
            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton
                    href={`/students/${studentId}`}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border-2 border-gray-100 relative overflow-hidden animate-fade-in-up">
                    <div
                        className={`absolute top-0 left-0 w-full h-1.5 ${config.bg}`}
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
                                <MessageCircle className="w-5 h-5 text-emerald-500" />
                            }
                            buttonLabel="หลักการพูดคุย"
                            href={`/students/${studentId}/help/conversation`}
                            bgClass={config.bg}
                        />

                        {showRecordSteps && (
                            <>
                                {/* Step 2: Counseling Summary */}
                                <StepCard
                                    stepNumber={2}
                                    title="สรุปประเด็นการพูดคุย"
                                    description="บันทึกสรุปประเด็นที่พูดคุยกับนักเรียน"
                                    icon={
                                        <ClipboardEdit className="w-5 h-5 text-emerald-500" />
                                    }
                                    buttonLabel="กรอกข้อมูล"
                                    onClick={() => setShowCounselingModal(true)}
                                    bgClass={config.bg}
                                />

                                {/* Step 3: Referral or Follow-up */}
                                <StepCard
                                    stepNumber={3}
                                    title="ส่งต่อโรงพยาบาล หรือ ติดตามต่อ"
                                    description="เลือกส่งต่อผู้เชี่ยวชาญ หรือติดตามดูแลต่อเนื่อง"
                                    icon={
                                        <Hospital className="w-5 h-5 text-emerald-500" />
                                    }
                                    buttonLabel="กรอกข้อมูล"
                                    onClick={() => setShowReferralModal(true)}
                                    bgClass={config.bg}
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
