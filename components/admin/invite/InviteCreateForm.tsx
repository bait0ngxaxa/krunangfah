"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Copy, Check } from "lucide-react";
import { createSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import type { InviteRole } from "@/types/school-admin-invite.types";

const inviteFormSchema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
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

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<InviteFormData>({
        resolver: zodResolver(inviteFormSchema),
        defaultValues: { role: "school_admin" },
    });

    async function onSubmit(data: InviteFormData) {
        setErrorMessage(null);
        setInviteUrl(null);

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
    }

    async function handleCopy() {
        if (!inviteUrl) return;
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-gray-100 shadow-sm relative overflow-hidden group">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                <Plus className="w-5 h-5 text-[#0BD0D9] stroke-3" />
                <span className="text-gray-900 font-extrabold">
                    สร้าง Invite Link
                </span>
            </h2>

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
                            className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 focus:border-[#0BD0D9] rounded-xl outline-none text-gray-900 placeholder:text-gray-400 transition-colors"
                            disabled={isSubmitting}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-500 font-medium">
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    <div className="sm:w-48">
                        <select
                            {...register("role")}
                            className="w-full px-4 py-3 border-2 border-gray-200 hover:border-gray-300 focus:border-[#0BD0D9] rounded-xl outline-none text-gray-900 cursor-pointer transition-colors"
                            disabled={isSubmitting}
                        >
                            <option value="school_admin">แอดมินโรงเรียน</option>
                            <option value="system_admin">แอดมินระบบ</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer shadow-sm"
                    >
                        {isSubmitting ? "กำลังสร้าง..." : "สร้าง Link"}
                    </button>
                </div>
            </form>

            {errorMessage && (
                <p className="mt-3 text-sm text-red-500 font-medium">
                    {errorMessage}
                </p>
            )}

            {inviteUrl && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-semibold text-green-700 mb-2">
                        สร้างคำเชิญสำเร็จ! คัดลอก link ด้านล่างเพื่อส่งให้ผู้รับ
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={inviteUrl}
                            className="flex-1 px-3 py-2 text-sm bg-white border border-green-200 rounded-lg text-gray-700 outline-none min-w-0"
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shrink-0"
                        >
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
