"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
    variant?: "default" | "navbar";
}

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
    const handleLogout = async () => {
        await signOut({ callbackUrl: "/" });
    };

    if (variant === "navbar") {
        return (
            <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-white/80 hover:text-white hover:bg-white/15 transition-all duration-300 cursor-pointer focus:outline-none"
            >
                ออกจากระบบ
            </button>
        );
    }

    return (
        <button
            onClick={handleLogout}
            className="px-5 py-2 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 font-semibold rounded-full transition-all duration-300 shadow-sm shadow-emerald-100/50 hover:shadow-md hover:shadow-emerald-200 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
        >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
        </button>
    );
}
