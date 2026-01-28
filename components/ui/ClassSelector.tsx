"use client";

/**
 * Class Selector Component
 * Dropdown สำหรับเลือกห้องเรียน
 */

import { useState } from "react";

interface ClassSelectorProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    id?: string;
    name?: string;
}

// รายการระดับชั้น
const GRADE_LEVELS = [
    { value: "ม.1", label: "ม.1" },
    { value: "ม.2", label: "ม.2" },
    { value: "ม.3", label: "ม.3" },
    { value: "ม.4", label: "ม.4" },
    { value: "ม.5", label: "ม.5" },
    { value: "ม.6", label: "ม.6" },
    { value: "ป.5", label: "ป.5" },
    { value: "ป.6", label: "ป.6" },
];

// รายการเลขห้อง (1-20)
const ROOM_NUMBERS = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
}));

export function ClassSelector({
    value,
    onChange,
    error,
    id = "advisoryClass",
    name = "advisoryClass",
}: ClassSelectorProps) {
    // Parse existing value
    const parseValue = (val: string) => {
        if (!val) return { grade: "", room: "" };
        const parts = val.split("/");
        return {
            grade: parts[0] || "",
            room: parts[1] || "",
        };
    };

    const parsed = parseValue(value);
    const [grade, setGrade] = useState(parsed.grade);
    const [room, setRoom] = useState(parsed.room);

    // Handle grade change
    const handleGradeChange = (newGrade: string) => {
        setGrade(newGrade);
        if (newGrade && room) {
            onChange(`${newGrade}/${room}`);
        } else if (!newGrade && !room) {
            onChange("");
        }
    };

    // Handle room change
    const handleRoomChange = (newRoom: string) => {
        setRoom(newRoom);
        if (grade && newRoom) {
            onChange(`${grade}/${newRoom}`);
        } else if (!grade && !newRoom) {
            onChange("");
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-3">
                {/* Grade Level */}
                <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">
                        ระดับชั้น
                    </label>
                    <select
                        value={grade}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">เลือกระดับชั้น</option>
                        {GRADE_LEVELS.map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Room Number */}
                <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">
                        ห้อง
                    </label>

                    <select
                        value={room}
                        onChange={(e) => handleRoomChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">เลือกห้อง</option>
                        {ROOM_NUMBERS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Hidden input for form */}
            <input type="hidden" id={id} name={name} value={value} />

            {/* Preview */}
            {grade && room && (
                <p className="text-sm text-gray-500">
                    ห้องที่เลือก:{" "}
                    <span className="font-medium text-gray-700">
                        {grade}/{room}
                    </span>
                </p>
            )}

            {/* Error */}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
