"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import {
    AUTH_INPUT_CLASS,
    AUTH_PRIMARY_BUTTON_CLASS,
} from "@/components/auth/authStyles";
import {
    inviteRegisterSchema,
    type InviteRegisterFormData,
} from "@/lib/validations/auth.validation";
import { acceptSchoolAdminInvite } from "@/lib/actions/school-admin-invite.actions";
import { getRateLimitMessageFromNextAuthCode } from "@/lib/rate-limit-errors";

interface InviteRegisterFormProps {
    token: string;
    email: string;
    redirectTo?: string;
}

interface InviteSignInResponse {
    success?: boolean;
    code?: string;
}

function isInviteSignInResponse(value: unknown): value is InviteSignInResponse {
    if (!value || typeof value !== "object") return false;

    const body = value as Record<string, unknown>;
    return (
        (body.success === undefined || typeof body.success === "boolean") &&
        (body.code === undefined || typeof body.code === "string")
    );
}

async function readInviteSignInResponse(
    response: Response,
): Promise<InviteSignInResponse> {
    try {
        const body: unknown = await response.json();
        return isInviteSignInResponse(body) ? body : {};
    } catch {
        return {};
    }
}

export function InviteRegisterForm({
    token,
    email,
    redirectTo: defaultRedirectTo = "/teacher-profile",
}: InviteRegisterFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InviteRegisterFormData>({
        resolver: zodResolver(inviteRegisterSchema),
    });

    const onSubmit = async (data: InviteRegisterFormData): Promise<void> => {
        if (isLoading) return;

        setIsLoading(true);
        setServerError(null);

        try {
            const result = await acceptSchoolAdminInvite(token, data.password);

            if (!result.success) {
                setServerError(result.message);
                return;
            }

            toast.success("สร้างบัญชีสำเร็จ กำลังเข้าสู่ระบบ…");

            const signInResponse = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: data.password }),
            });
            const signInResult = await readInviteSignInResponse(signInResponse);

            if (!signInResponse.ok || !signInResult.success) {
                const rateLimitMessage = getRateLimitMessageFromNextAuthCode(
                    signInResult.code,
                );
                if (rateLimitMessage) {
                    setServerError(rateLimitMessage);
                    toast.error(rateLimitMessage);
                    router.push("/signin");
                    return;
                }

                const message = "สร้างบัญชีสำเร็จ กรุณาเข้าสู่ระบบด้วยตัวเอง";
                setServerError(message);
                toast.error(message);
                router.push("/signin");
                return;
            }

            const destination = result.redirectTo ?? defaultRedirectTo;
            router.push(destination);
            router.refresh();
        } catch {
            const message = "สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
            setServerError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email (read-only) */}
            <div>
                <label
                    htmlFor="email"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    อีเมล
                </label>
                <input
                    id="email"
                    type="email"
                    readOnly
                    value={email}
                    aria-label="อีเมลจากคำเชิญ"
                    className="w-full cursor-not-allowed rounded-full border-2 border-emerald-100 bg-gray-50 px-4 py-3.5 text-gray-600 outline-none"
                />
            </div>

            {/* Password */}
            <div>
                <label
                    htmlFor="password"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    รหัสผ่าน
                </label>
                <input
                    {...register("password")}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                        errors.password ? "invite-password-error" : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                />
                {errors.password && (
                    <p
                        id="invite-password-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.password.message}
                    </p>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    ยืนยันรหัสผ่าน
                </label>
                <input
                    {...register("confirmPassword")}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={
                        errors.confirmPassword
                            ? "invite-confirm-password-error"
                            : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                    placeholder="••••••••"
                />
                {errors.confirmPassword && (
                    <p
                        id="invite-confirm-password-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            {serverError && (
                <div
                    className="rounded-xl border border-red-200 bg-red-50 p-3"
                    role="status"
                    aria-live="polite"
                >
                    <p className="flex items-start gap-1.5 text-sm text-red-600">
                        <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                            {serverError}
                        </span>
                    </p>
                </div>
            )}

            <div className="flex justify-center pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className={AUTH_PRIMARY_BUTTON_CLASS}
                >
                    {isLoading && (
                        <Loader2
                            className="h-5 w-5 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    {isLoading ? "กำลังสร้างบัญชี…" : "สร้างบัญชี"}
                </button>
            </div>
        </form>
    );
}
