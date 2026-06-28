"use client";

import { useEffect } from "react";

interface ProvidersProps {
    children: React.ReactNode;
    rotateSession?: boolean;
}

export function Providers({
    children,
    rotateSession = true,
}: ProvidersProps) {
    useEffect(() => {
        if (!rotateSession) {
            return;
        }

        void fetch("/api/auth/rotate", { method: "POST" });
    }, [rotateSession]);

    return <>{children}</>;
}
