"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard, SectionCardHeader } from "@/components/ui/SectionCard";
import { createSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import type { InviteRole } from "@/types/school-admin-invite.types";

const inviteFormSchema = z.object({
    email: z
        .string()
        .trim()
        .email("อีเมลไม่ถูกต้อง")
        .max(254, "อีเมลยาวเกินไป"),
    role: z.enum(["system_admin", "school_admin"]),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

interface InviteCreateFormProps {
    onCreated: () => void;
}

export function InviteCreateForm({ onCreated }: InviteCreateFormProps) {
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const inviteResultRef = useRef<HTMLDivElement | null>(null);
    const inviteLinkInputRef = useRef<HTMLInputElement | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<InviteFormData>({
        resolver: zodResolver(inviteFormSchema),
        defaultValues: { role: "school_admin" },
    });

    useEffect(() => {
        if (!inviteUrl) return;

        const resultPanel = inviteResultRef.current;
        const linkInput = inviteLinkInputRef.current;
        if (!resultPanel || !linkInput) return;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        resultPanel.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
        });

        const focusTimer = window.setTimeout(
            () => {
                linkInput.focus({ preventScroll: true });
                linkInput.select();
            },
            prefersReducedMotion ? 0 : 220,
        );

        return () => window.clearTimeout(focusTimer);
    }, [inviteUrl]);

    async function onSubmit(data: InviteFormData): Promise<void> {
        setErrorMessage(null);
        setInviteUrl(null);

        try {
            const result = await createSchoolAdminInvite(
                data.email,
                data.role as InviteRole,
            );

            if (!result.success || !result.data) {
                setErrorMessage(result.message);
                return;
            }

            setInviteUrl(result.data.inviteUrl);
            reset();
            onCreated();
        } catch {
            setErrorMessage("สร้างคำเชิญไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
    }

    async function handleCopy(): Promise<void> {
        if (!inviteUrl) return;

        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setErrorMessage(null);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setErrorMessage("ไม่สามารถคัดลอกลิงก์ได้ กรุณาคัดลอกด้วยตนเอง");
        }
    }

    return (
        <SectionCard className="p-6 md:p-8">
            <SectionCardHeader
                icon={Plus}
                className="text-xl"
                title="สร้างลิงก์คำเชิญ"
            />

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-3"
            >
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <input
                            {...register("email")}
                            type="email"
                            placeholder="example@email.com"
                            autoComplete="email"
                            aria-label="อีเมลผู้รับคำเชิญ"
                            aria-invalid={!!errors.email}
                            aria-describedby={
                                errors.email ? "invite-email-error" : undefined
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 focus:border-[var(--brand-primary)] rounded-xl outline-none text-gray-900 placeholder:text-gray-400 transition-colors"
                            disabled={isSubmitting}
                        />
                        {errors.email && (
                            <p
                                id="invite-email-error"
                                className="mt-1 text-sm font-medium text-red-600"
                            >
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    <div className="sm:w-48">
                        <select
                            {...register("role")}
                            aria-label="บทบาทของคำเชิญ"
                            className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 focus:border-[var(--brand-primary)] rounded-xl outline-none text-gray-900 cursor-pointer transition-colors"
                            disabled={isSubmitting}
                        >
                            <option value="school_admin">แอดมินโรงเรียน</option>
                            <option value="system_admin">แอดมินระบบ</option>
                        </select>
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant="primary"
                        size="lg"
                        className="whitespace-nowrap"
                    >
                        {isSubmitting ? "กำลังสร้าง…" : "สร้างลิงก์"}
                    </Button>
                </div>
            </form>

            {errorMessage && (
                <p
                    className="mt-3 flex items-start gap-1.5 text-sm font-medium text-red-600"
                    role="status"
                    aria-live="polite"
                >
                    <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>{errorMessage}</span>
                </p>
            )}

            {inviteUrl && (
                <div
                    ref={inviteResultRef}
                    className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4"
                    role="status"
                    aria-live="polite"
                >
                    <p className="text-sm font-semibold text-green-700 mb-2">
                        สร้างคำเชิญสำเร็จ คัดลอกลิงก์ด้านล่างเพื่อส่งให้ผู้รับ
                    </p>
                    <p className="mb-3 text-xs font-medium leading-5 text-green-800">
                        ลิงก์จะแสดงแค่ครั้งเดียว กรุณาคัดลอกก่อนออกจากหน้านี้
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                            ref={inviteLinkInputRef}
                            type="text"
                            readOnly
                            value={inviteUrl}
                            aria-label="ลิงก์คำเชิญที่สร้างแล้ว"
                            className="min-w-0 flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        />
                        <Button
                            type="button"
                            onClick={handleCopy}
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                        >
                            {copied ? (
                                <Check className="w-4 h-4" aria-hidden="true" />
                            ) : (
                                <Copy className="w-4 h-4" aria-hidden="true" />
                            )}
                            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                        </Button>
                    </div>
                </div>
            )}
        </SectionCard>
    );
}
