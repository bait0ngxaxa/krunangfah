"use client";

import { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface InviteActionRowProps {
    copied: boolean;
    isRevoking: boolean;
    onCopy: () => void | Promise<void>;
    onConfirmRevoke: () => void | Promise<void>;
    revokeDialogTitle: string;
    revokeDialogMessage: string;
    copyTitle?: string;
    copyLabel?: string;
    copiedLabel?: string;
    revokeButtonLabel?: string;
    confirmLabel?: string;
}

export function InviteActionRow({
    copied,
    isRevoking,
    onCopy,
    onConfirmRevoke,
    revokeDialogTitle,
    revokeDialogMessage,
    copyTitle = "คัดลอก Link",
    copyLabel = "Copy Link",
    copiedLabel = "คัดลอกแล้ว",
    revokeButtonLabel = "ยกเลิก",
    confirmLabel = "ยืนยันยกเลิก",
}: InviteActionRowProps) {
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);

    async function handleConfirmRevoke() {
        await onConfirmRevoke();
        setShowRevokeDialog(false);
    }

    return (
        <>
            <div className="flex items-center gap-1.5">
                <Button
                    type="button"
                    onClick={onCopy}
                    variant="secondary"
                    size="sm"
                    className="px-2.5 py-1.5 text-xs"
                    title={copyTitle}
                >
                    {copied ? (
                        <Check className="w-3.5 h-3.5" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? copiedLabel : copyLabel}
                </Button>

                <Button
                    type="button"
                    onClick={() => setShowRevokeDialog(true)}
                    variant="danger"
                    size="sm"
                    className="px-2.5 py-1.5 text-xs"
                    title="ยกเลิกคำเชิญ"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    {revokeButtonLabel}
                </Button>
            </div>

            <ConfirmDialog
                isOpen={showRevokeDialog}
                title={revokeDialogTitle}
                message={revokeDialogMessage}
                confirmLabel={confirmLabel}
                isLoading={isRevoking}
                onConfirm={handleConfirmRevoke}
                onCancel={() => setShowRevokeDialog(false)}
            />
        </>
    );
}
