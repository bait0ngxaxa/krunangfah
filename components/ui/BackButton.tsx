"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
    label?: string;
    className?: string;
}

export function BackButton({
    href,
    label = "กลับหน้า Dashboard",
    className = "",
}: BackButtonProps) {
    return (
        <div className={`mb-6 ${className}`}>
            <Link
                href={href}
                className="group inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-white/80 hover:shadow-sm px-4 py-2 rounded-full border border-transparent hover:border-pink-200"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>{label}</span>
            </Link>
        </div>
    );
}
