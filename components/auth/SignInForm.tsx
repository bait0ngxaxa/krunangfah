"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import {
    signInSchema,
    type SignInFormData,
} from "@/lib/validations/auth.validation";
import { getRateLimitMessageFromNextAuthCode } from "@/lib/rate-limit-errors";
import {
    AUTH_INPUT_CLASS,
    AUTH_PRIMARY_BUTTON_CLASS,
    AUTH_TEXT_LINK_CLASS,
} from "@/components/auth/authStyles";

interface SignInFormProps {
    callbackUrl?: string;
}

interface SignInResponseBody {
    success?: boolean;
    message?: string;
    code?: string;
    redirectTo?: string;
}

function isSignInResponseBody(value: unknown): value is SignInResponseBody {
    if (!value || typeof value !== "object") return false;

    const body = value as Record<string, unknown>;
    return (
        (body.success === undefined || typeof body.success === "boolean") &&
        (body.message === undefined || typeof body.message === "string") &&
        (body.code === undefined || typeof body.code === "string") &&
        (body.redirectTo === undefined || typeof body.redirectTo === "string")
    );
}

async function readSignInResponse(
    response: Response,
): Promise<SignInResponseBody> {
    try {
        const body: unknown = await response.json();
        return isSignInResponseBody(body) ? body : {};
    } catch {
        return {};
    }
}

export function getSafeCallbackUrl(callbackUrl?: string): string {
    if (!callbackUrl) return "/dashboard";

    try {
        const parsedUrl = new URL(callbackUrl, window.location.origin);
        const isInternalPath =
            callbackUrl.startsWith("/") &&
            !callbackUrl.startsWith("//") &&
            parsedUrl.origin === window.location.origin;

        if (!isInternalPath) return "/dashboard";

        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
        return "/dashboard";
    }
}

export function SignInForm({
    callbackUrl = "/dashboard",
}: SignInFormProps): ReactElement {
    const router = useRouter();
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInSchema),
    });

    const onSubmit = async (data: SignInFormData): Promise<void> => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await readSignInResponse(response);

            if (!response.ok || !result.success) {
                const rateLimitMessage = getRateLimitMessageFromNextAuthCode(
                    result.code,
                );
                if (rateLimitMessage) {
                    setError(rateLimitMessage);
                    toast.error(rateLimitMessage);
                    return;
                }

                const message = result.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                setError(message);
                toast.error(message);
                return;
            }

            toast.success("เข้าสู่ระบบสำเร็จ");
            router.push(getSafeCallbackUrl(callbackUrl || result.redirectTo));
            router.refresh();
        } catch {
            const message = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
                <label
                    htmlFor="email"
                    className="block text-base font-medium text-gray-700 mb-2"
                >
                    อีเมล
                </label>
                <input
                    {...register("email")}
                    type="email"
                    id="email"
                    autoComplete="email"
                    spellCheck={false}
                    disabled={isLoading}
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={AUTH_INPUT_CLASS}
                    placeholder="your@email.com"
                />
                {errors.email && (
                    <p
                        id="email-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.email.message}
                    </p>
                )}
            </div>

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
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                        errors.password ? "password-error" : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                    placeholder="••••••••"
                />
                {errors.password && (
                    <p
                        id="password-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-600"
                    >
                        {errors.password.message}
                    </p>
                )}
                <div className="mt-2 text-right">
                    <Link
                        href="/forgot-password"
                        className={AUTH_TEXT_LINK_CLASS}
                    >
                        ลืมรหัสผ่าน?
                    </Link>
                </div>
            </div>

            {error && (
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
                        <span className="min-w-0 break-words">{error}</span>
                    </p>
                </div>
            )}

            <div className="flex justify-center pt-1">
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
                    <span>{isLoading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</span>
                </button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-1">
                ยังไม่มีบัญชี? ติดต่อผู้ดูแล
            </p>
        </form>
    );
}
