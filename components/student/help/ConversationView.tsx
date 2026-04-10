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
import {
    studentHelpConversationRoute,
    studentRoute,
} from "@/lib/constants/student-routes";

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
    const buttonClasses = `group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition-base hover:-translate-y-0.5 hover:shadow-md ${bgClass}`;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-sm transition-base hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-4">
                {/* Step Number Badge */}
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm ${bgClass}`}
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
                    <p className="mb-4 text-sm text-gray-500">{description}</p>

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
        <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8">
            <div className="max-w-4xl mx-auto relative z-10">
                <BackButton
                    href={studentRoute(studentId)}
                    label="กลับหน้าข้อมูลนักเรียน"
                />

                <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white to-slate-50 p-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] md:p-8">
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
                                <MessageCircle className={`w-5 h-5 ${config.textColor}`} />
                            }
                            buttonLabel="หลักการพูดคุย"
                            href={studentHelpConversationRoute(studentId)}
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
                                        <ClipboardEdit className={`w-5 h-5 ${config.textColor}`} />
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
                                        <Hospital className={`w-5 h-5 ${config.textColor}`} />
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
