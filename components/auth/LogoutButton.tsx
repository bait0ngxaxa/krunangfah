"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
    const handleLogout = async () => {
        await signOut({ callbackUrl: "/" });
    };

    return (
        <button
            onClick={handleLogout}
            className="px-5 py-2 bg-linear-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
            ออกจากระบบ
        </button>
    );
}
