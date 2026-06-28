"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { InviteLinkSectionProps } from "../types";

function useInviteLinkFocus(inviteLink: string): {
    linkInputRef: React.RefObject<HTMLInputElement | null>;
    resultPanelRef: React.RefObject<HTMLDivElement | null>;
} {
    const linkInputRef = useRef<HTMLInputElement | null>(null);
    const resultPanelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!inviteLink) return;

        const resultPanel = resultPanelRef.current;
        const linkInput = linkInputRef.current;
        if (!resultPanel || !linkInput) return;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        resultPanel.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
        });

        const focusTimer = window.setTimeout(
            () => {
                linkInput.focus({ preventScroll: true });
                linkInput.select();
            },
            prefersReducedMotion ? 0 : 220,
        );

        return () => window.clearTimeout(focusTimer);
    }, [inviteLink]);

    return { linkInputRef, resultPanelRef };
}

export function InviteLinkSection({
    success,
    inviteLink,
    onCopy,
}: InviteLinkSectionProps): React.ReactNode {
    const { linkInputRef, resultPanelRef } = useInviteLinkFocus(inviteLink);

    if (!success) return null;

    return (
        <div
            ref={resultPanelRef}
            className="p-4 text-sm text-green-700 bg-green-50 border-2 border-green-100 rounded-xl shadow-sm animate-fade-in-down"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-100 p-1 rounded-full text-green-600">
                    <Check className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="font-bold">{success}</span>
            </div>
            {inviteLink && (
                <div className="mt-3 bg-white p-3 rounded-lg border-2 border-green-50">
                    <p className="font-medium text-green-800 mb-2 text-xs uppercase tracking-wider">
                        Link สำหรับครูผู้ดูแล:
                    </p>
                    <p className="mb-3 text-xs font-medium leading-5 text-green-800">
                        ลิงก์จะแสดงแค่ครั้งเดียว กรุณาคัดลอกก่อนออกจากหน้านี้
                    </p>
                    <div className="flex gap-2">
                        <input
                            ref={linkInputRef}
                            type="text"
                            readOnly
                            value={inviteLink}
                            aria-label="Link สำหรับครูผู้ดูแล"
                            className="flex-1 px-3 py-2 text-sm border-2 border-green-100 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 min-w-0"
                        />
                        <Button
                            type="button"
                            onClick={() => void onCopy()}
                            variant="primary"
                            size="sm"
                            className="shrink-0"
                        >
                            คัดลอก
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
