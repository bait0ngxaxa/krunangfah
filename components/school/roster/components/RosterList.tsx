"use client";

import { RosterItem } from "./RosterItem";
import type { RosterListProps } from "../types";

export function RosterList({
    roster,
    editingId,
    readOnly,
    onEdit,
    onRemove,
}: RosterListProps) {
    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
                รายชื่อครูทั้งหมด ({roster.length} คน)
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {roster.map((t) => (
                    <RosterItem
                        key={t.id}
                        teacher={t}
                        isEditing={editingId === t.id}
                        readOnly={readOnly}
                        onEdit={onEdit}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
}
