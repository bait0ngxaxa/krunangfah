import { Check } from "lucide-react";
import type { InviteLinkSectionProps } from "../types";

export function InviteLinkSection({
    success,
    inviteLink,
    onCopy,
}: InviteLinkSectionProps): React.ReactNode {
    if (!success) return null;

    return (
        <div className="p-4 text-sm text-green-700 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-xl shadow-sm animate-fade-in-down">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-100 p-1 rounded-full text-green-600">
                    <Check className="w-4 h-4" />
                </span>
                <span className="font-bold">{success}</span>
            </div>
            {inviteLink && (
                <div className="mt-3 bg-white/60 p-3 rounded-lg border border-green-100">
                    <p className="font-medium text-green-800 mb-2 text-xs uppercase tracking-wider">
                        Link สำหรับครูผู้ดูแล:
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            className="flex-1 px-3 py-2 text-sm border border-green-200 rounded-lg bg-white/80 text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-200"
                        />
                        <button
                            type="button"
                            onClick={onCopy}
                            className="px-4 py-2 text-sm font-bold bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 shadow-sm transition-all hover:shadow-md"
                        >
                            คัดลอก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
