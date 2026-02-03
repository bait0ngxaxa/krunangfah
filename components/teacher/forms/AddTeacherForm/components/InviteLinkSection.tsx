import type { InviteLinkSectionProps } from "../types";

export function InviteLinkSection({
    success,
    inviteLink,
    onCopy,
}: InviteLinkSectionProps): React.ReactNode {
    if (!success) return null;

    return (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
            {success}
            {inviteLink && (
                <div className="mt-2">
                    <p className="font-medium">Link สำหรับครูผู้ดูแล:</p>
                    <div className="flex gap-2 mt-1">
                        <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                        />
                        <button
                            type="button"
                            onClick={onCopy}
                            className="px-3 py-1 text-xs bg-linear-to-r from-pink-500 to-purple-500 text-white rounded hover:from-pink-600 hover:to-purple-600"
                        >
                            คัดลอก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
