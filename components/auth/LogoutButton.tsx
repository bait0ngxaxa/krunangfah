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
                className="px-5 py-2 bg-white/20 text-white border border-white/30 hover:bg-white/30 hover:border-white/50 font-semibold rounded-full transition-all duration-300 flex items-center gap-2 text-sm cursor-pointer"
            >
                <LogOut className="w-4 h-4" />
                ออกจากระบบ
            </button>
        );
    }

    return (
        <button
            onClick={handleLogout}
            className="px-5 py-2 bg-white text-pink-600 border border-pink-200 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700 font-semibold rounded-full transition-all duration-300 shadow-sm shadow-pink-100/50 hover:shadow-md hover:shadow-pink-200 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
        >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
        </button>
    );
}
