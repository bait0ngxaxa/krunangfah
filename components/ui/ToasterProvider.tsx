"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
    return (
        <Toaster
            position="top-center"
            richColors
            expand={true}
            closeButton
            toastOptions={{
                className: "font-sans",
                style: {
                    borderRadius: "12px",
                    padding: "16px",
                    fontFamily:
                        "var(--font-google-sans), system-ui, -apple-system, sans-serif",
                },
            }}
        />
    );
}
