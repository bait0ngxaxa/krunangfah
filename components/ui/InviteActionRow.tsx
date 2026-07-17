"use client";

import { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface InviteActionRowProps {
    isRevoking: boolean;
    onConfirmRevoke: () => boolean | void | Promise<boolean | void>;
    revokeDialogTitle: string;
    revokeDialogMessage: string;
    copied?: boolean;
    onCopy?: () => void | Promise<void>;
    copyTitle?: string;
    copyLabel?: string;
    copiedLabel?: string;
    revokeButtonLabel?: string;
    confirmLabel?: string;
    showCopyButton?: boolean;
    showRevokeButton?: boolean;
}

export function InviteActionRow({
    isRevoking,
    onConfirmRevoke,
    revokeDialogTitle,
    revokeDialogMessage,
    copied = false,
    onCopy,
    copyTitle = "คัดลอกลิงก์",
    copyLabel = "คัดลอกลิงก์",
    copiedLabel = "คัดลอกแล้ว",
    revokeButtonLabel = "ยกเลิก",
    confirmLabel = "ยืนยันยกเลิก",
    showCopyButton = true,
    showRevokeButton = true,
}: InviteActionRowProps) {
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const canCopy = showCopyButton && typeof onCopy === "function";

    async function handleConfirmRevoke(): Promise<void> {
        const shouldClose = await onConfirmRevoke();
        if (shouldClose === false) {
            return;
        }
        setShowRevokeDialog(false);
    }

    return (
        <>
            {(canCopy || showRevokeButton) && (
                <div
                    className={
                        canCopy
                            ? "grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1.5"
                            : "grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-1.5"
                    }
                >
                {canCopy && (
                    <Button
                        type="button"
                        onClick={onCopy}
                        disabled={isRevoking}
                        variant="secondary"
                        size="sm"
                        className="justify-center px-2.5 py-1.5 text-xs"
                        title={copyTitle}
                    >
                        {copied ? (
                            <Check
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                            />
                        ) : (
                            <Copy
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                            />
                        )}
                        {copied ? copiedLabel : copyLabel}
                    </Button>
                )}

                    {showRevokeButton && (
                        <Button
                            type="button"
                            onClick={() => setShowRevokeDialog(true)}
                            disabled={isRevoking}
                            variant="danger"
                            size="sm"
                            className="justify-center px-2.5 py-1.5 text-xs"
                            title="ยกเลิกคำเชิญ"
                        >
                            <Trash2
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                            />
                            {revokeButtonLabel}
                        </Button>
                    )}
                </div>
            )}

            {showRevokeButton && (
                <ConfirmDialog
                    isOpen={showRevokeDialog}
                    title={revokeDialogTitle}
                    message={revokeDialogMessage}
                    confirmLabel={confirmLabel}
                    isLoading={isRevoking}
                    onConfirm={handleConfirmRevoke}
                    onCancel={() => {
                        if (isRevoking) return;
                        setShowRevokeDialog(false);
                    }}
                />
            )}
        </>
    );
}
