"use client";

import { useEffect } from "react";

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    useEffect(() => {
        void fetch("/api/auth/rotate", { method: "POST" });
    }, []);

    return <>{children}</>;
}
