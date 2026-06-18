"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import {
    User,
    FileText,
    Hospital,
    ClipboardCheck,
    School,
    Hash,
    Cake,
    CreditCard,
    Pencil,
    CalendarDays,
    type LucideIcon,
} from "lucide-react";
import {
    getRiskLevelConfig,
    isRiskLevel,
} from "@/lib/constants/risk-levels";
import { formatAcademicYear } from "@/lib/utils/academic-year";
import { StudentStatusControl } from "./StudentStatusControl";
import { StudentProfileEditModal } from "./StudentProfileEditModal";

interface StudentProfileCardProps {
    student: {
        id: string;
        firstName: string;
        lastName: string;
        studentId?: string | null;
        nationalId?: string | null;
        gender?: string | null;
        age?: number | null;
        class: string;
        school?: {
            name: string;
        } | null;
        status?: string | null;
    };
    latestResult?: {
        id: string;
        totalScore: number;
        riskLevel: string;
        referredToHospital: boolean;
        hospitalName?: string | null;
        createdAt: Date;
        assessmentRound: number;
        academicYear: {
            year: number;
            semester: number;
        };
    } | null;
    activePhqResultId?: string;
    canViewNationalId?: boolean;
    canEditProfile?: boolean;
}

interface DetailItem {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: string;
    hideLabel?: boolean;
}

function formatGender(gender?: string | null): string | null {
    if (!gender) return null;
    return gender === "MALE" ? "ชาย" : "หญิง";
}

function formatAssessmentDate(date: Date): string {
    return new Date(date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function buildDetailItems(
    student: StudentProfileCardProps["student"],
    canViewNationalId: boolean,
): DetailItem[] {
    const items: DetailItem[] = [
        {
            label: "ห้องเรียน",
            value: student.class,
            icon: School,
            tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        },
    ];
    const gender = formatGender(student.gender);

    if (canViewNationalId && student.school?.name) {
        items.push({
            label: "โรงเรียน",
            value: student.school.name,
            icon: School,
            tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
            hideLabel: true,
        });
    }

    if (gender) {
        items.push({
            label: "เพศ",
            value: gender,
            icon: User,
            tone: "border-violet-200 bg-violet-50 text-violet-800",
        });
    }
    if (student.age) {
        items.push({
            label: "อายุ",
            value: `${student.age} ปี`,
            icon: Cake,
            tone: "border-sky-200 bg-sky-50 text-sky-800",
        });
    }
    if (student.studentId) {
        items.push({
            label: "รหัสนักเรียน",
            value: student.studentId,
            icon: Hash,
            tone: "border-slate-200 bg-slate-50 text-slate-700",
        });
    }
    if (canViewNationalId && student.nationalId) {
        items.push({
            label: "เลขบัตร",
            value: student.nationalId,
            icon: CreditCard,
            tone: "border-amber-200 bg-amber-50 text-amber-800",
        });
    }

    return items;
}

export function StudentProfileCard({
    student,
    latestResult,
    activePhqResultId,
    canViewNationalId = false,
    canEditProfile = false,
}: StudentProfileCardProps): ReactElement {
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
    const [profileStudent, setProfileStudent] = useState(student);
    const latestRiskLevel =
        latestResult && isRiskLevel(latestResult.riskLevel)
            ? latestResult.riskLevel
            : null;
    const risk = latestRiskLevel ? getRiskLevelConfig(latestRiskLevel) : null;
    const detailItems = buildDetailItems(profileStudent, canViewNationalId);
    const avatarBg = risk ? risk.bgSolid : "bg-[var(--brand-primary)]";

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_8px_rgba(15,23,42,0.04)]">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:p-7">
                <div className="min-w-0">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${avatarBg} text-2xl font-bold text-white sm:h-20 sm:w-20 sm:text-3xl`}
                            aria-hidden="true"
                        >
                            {profileStudent.firstName.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-500">
                                        ข้อมูลนักเรียน
                                    </p>
                                    <h1 className="mt-1 break-words text-pretty text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                                        {profileStudent.firstName}{" "}
                                        {profileStudent.lastName}
                                    </h1>
                                </div>
                                {canEditProfile && (
                                    <button
                                        type="button"
                                        onClick={() => setIsProfileEditOpen(true)}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                                        aria-label="แก้ไขข้อมูลนักเรียน"
                                    >
                                        <Pencil
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {detailItems.map((item) => (
                                    <DetailPill key={item.label} item={item} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                    {risk && latestResult && (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                <div
                                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${risk.headerGradient} ${risk.headerTextColor}`}
                                >
                                    <span className="text-base leading-none">
                                        {risk.emoji}
                                    </span>
                                    <span>{risk.label}</span>
                                </div>
                            </div>

                            {latestRiskLevel === "red" && (
                                <ReferralState
                                    hospitalName={latestResult.hospitalName}
                                    referredToHospital={
                                        latestResult.referredToHospital
                                    }
                                />
                            )}

                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2 text-slate-600">
                                    <CalendarDays
                                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="font-semibold text-slate-800">
                                            {formatAcademicYear(
                                                latestResult.academicYear.year,
                                                latestResult.academicYear
                                                    .semester,
                                                "long",
                                            )}{" "}
                                            ครั้งที่{" "}
                                            {latestResult.assessmentRound}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatAssessmentDate(
                                                latestResult.createdAt,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <StudentStatusControl
                        studentId={profileStudent.id}
                        currentStatus={profileStudent.status ?? "ACTIVE"}
                        canEdit={false}
                    />
                </div>
            </div>
            {isProfileEditOpen && activePhqResultId && (
                <StudentProfileEditModal
                    student={profileStudent}
                    activePhqResultId={activePhqResultId}
                    isOpen={isProfileEditOpen}
                    onClose={() => setIsProfileEditOpen(false)}
                    onSaved={(updatedStudent) =>
                        setProfileStudent((currentStudent) => ({
                            ...currentStudent,
                            ...updatedStudent,
                        }))
                    }
                />
            )}

            {!latestResult && (
                <div className="mx-5 mb-5 flex items-center gap-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-600 sm:mx-6 lg:mx-7">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="font-semibold">ยังไม่มีผลการคัดกรอง PHQ-A</p>
                </div>
            )}
        </section>
    );
}

function DetailPill({ item }: { item: DetailItem }): ReactElement {
    const Icon = item.icon;

    return (
        <span
            className={`inline-flex min-h-9 max-w-full min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${item.tone}`}
        >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!item.hideLabel && (
                <span className="shrink-0 text-current opacity-70">
                    {item.label}
                </span>
            )}
            <span className="truncate">{item.value}</span>
        </span>
    );
}

function ReferralState({
    hospitalName,
    referredToHospital,
}: {
    hospitalName?: string | null;
    referredToHospital: boolean;
}): ReactElement {
    const Icon = referredToHospital ? Hospital : ClipboardCheck;
    const label = referredToHospital
        ? `ส่งต่อ: ${hospitalName || "โรงพยาบาล"}`
        : "ติดตามต่อ";
    const tone = referredToHospital
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : "border-sky-200 bg-sky-50 text-sky-800";

    return (
        <div
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${tone}`}
        >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
        </div>
    );
}
