"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
    const handleLogout = async () => {
        await signOut({ callbackUrl: "/" });
    };

    return (
        <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md"
        >
            ออกจากระบบ
        </button>
    );
}
