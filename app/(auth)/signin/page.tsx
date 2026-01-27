import { SignInForm } from "@/components/auth/SignInForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | Krunangfah",
    description: "Sign in to your account",
};

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const { callbackUrl } = await searchParams;

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Krunangfah
                    </h1>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Welcome back! Please enter your credentials.
                    </p>
                </div>

                <div className="mt-8 bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                    <SignInForm callbackUrl={callbackUrl} />

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            ยังไม่มีบัญชี?{" "}
                            <Link
                                href="/signup"
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                ลงทะเบียน
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-600">
                    Protected by NextAuth.js
                </p>
            </div>
        </div>
    );
}
