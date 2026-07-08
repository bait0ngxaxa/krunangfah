import { getActionLabel, toUiAction } from "./labels";
import type { DataManagementEventItem } from "./types";

export function EventRow({
    event,
    compact = false,
}: {
    event: DataManagementEventItem;
    compact?: boolean;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">
                    {getActionLabel(toUiAction(event.action))}
                </p>
                <p className="text-xs text-gray-500">
                    {event.createdAt.toLocaleString("th-TH")}
                </p>
            </div>
            {!compact ? (
                <p className="mt-1 text-xs text-gray-600">{event.targetLabel}</p>
            ) : null}
            <p className="mt-1 text-xs font-medium text-gray-700">
                ทำรายการโดย {event.actorEmail ?? "ไม่พบอีเมลผู้ทำรายการ"}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-600">
                {event.reason}
            </p>
        </div>
    );
}
