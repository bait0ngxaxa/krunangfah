"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

interface LogoutButtonProps {
    variant?: "default" | "navbar";
    tabIndex?: number;
}

export function LogoutButton({ variant = "default", tabIndex }: LogoutButtonProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async (): Promise<void> => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);
        try {
            await fetch("/api/auth/signout", { method: "POST" });
        } finally {
            window.location.href = "/";
        }
    };

    if (variant === "navbar") {
        return (
            <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
                tabIndex={tabIndex}
                className="flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white/85 transition-colors duration-200 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-70"
            >
                {isLoggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            tabIndex={tabIndex}
            className="flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2 font-semibold text-emerald-600 shadow-sm shadow-emerald-100/50 transition-base duration-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md hover:shadow-emerald-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {isLoggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
        </button>
    );
}
