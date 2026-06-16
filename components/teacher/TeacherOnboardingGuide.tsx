"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";

export type TeacherSetupSectionId = "classes" | "roster" | "invite";

type StepState = "done" | "current" | "waiting";

interface TeacherOnboardingGuideProps {
    classCount: number;
    rosterCount: number;
    inviteCount: number;
    onSelect: (sectionId: TeacherSetupSectionId) => void;
}

interface FlowStepRowProps {
    state: StepState;
    title: string;
    description: string;
    meta: string;
    onSelect: () => void;
}

function getStepState(
    isDone: boolean,
    previousDone: boolean,
): StepState {
    if (isDone) return "done";
    return previousDone ? "current" : "waiting";
}

function FlowStepRow({
    state,
    title,
    description,
    meta,
    onSelect,
}: FlowStepRowProps): ReactNode {
    const Icon =
        state === "done" ? CheckCircle2 : state === "current" ? Clock3 : Circle;
    const stateLabel =
        state === "done" ? "เสร็จแล้ว" : state === "current" ? "ทำขั้นตอนนี้" : "รอก่อน";
    const tone =
        state === "done"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : state === "current"
              ? "border-cyan-200 bg-cyan-50 text-cyan-800"
              : "border-slate-200 bg-white text-slate-600";

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${tone}`}
        >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{title}</span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">
                        {stateLabel}
                    </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-current opacity-75">
                    {description}
                </span>
            </span>
            <span className="shrink-0 rounded-lg bg-white/85 px-2 py-1 text-xs font-bold">
                {meta}
            </span>
        </button>
    );
}

export function TeacherOnboardingGuide({
    classCount,
    rosterCount,
    inviteCount,
    onSelect,
}: TeacherOnboardingGuideProps): ReactNode {
    const hasClasses = classCount > 0;
    const hasRoster = rosterCount > 0;
    const hasInvites = inviteCount > 0;

    return (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-semibold">
                    เริ่มใช้งานให้ครบใน 3 ขั้นตอน
                </p>
            </div>
            <p className="mt-1 text-xs leading-5 text-emerald-900/75">
                ห้องเรียนต้องพร้อมก่อนเลือกห้องที่ปรึกษา จากนั้นเพิ่มครูในรายชื่อ
                แล้วสร้างลิงก์เชิญให้ครูตั้งรหัสผ่าน
            </p>
            <div className="mt-4 space-y-2">
                <FlowStepRow
                    state={getStepState(hasClasses, true)}
                    title="เพิ่มห้องเรียน"
                    description="สร้างห้องที่ต้องใช้ตอนนำเข้านักเรียนและกำหนดครูประจำชั้น"
                    meta={`${classCount} ห้อง`}
                    onSelect={() => onSelect("classes")}
                />
                <FlowStepRow
                    state={getStepState(hasRoster, hasClasses)}
                    title="เพิ่มครู"
                    description="บันทึกชื่อ บทบาท อีเมล และห้องที่ปรึกษาก่อนส่งคำเชิญ"
                    meta={`${rosterCount} คน`}
                    onSelect={() => onSelect("roster")}
                />
                <FlowStepRow
                    state={getStepState(hasInvites, hasClasses && hasRoster)}
                    title="เชิญครู"
                    description="เลือกครูจากรายชื่อเพื่อสร้างลิงก์เชิญเข้าระบบ"
                    meta={`${inviteCount} คำเชิญ`}
                    onSelect={() => onSelect("invite")}
                />
            </div>
        </div>
    );
}
