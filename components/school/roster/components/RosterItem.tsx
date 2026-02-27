"use client";

import { Pencil, X } from "lucide-react";
import { USER_ROLE_LABELS, PROJECT_ROLE_LABELS } from "@/lib/constants/roles";
import type { RosterItemProps } from "../types";

export function RosterItem({
    teacher,
    isEditing,
    readOnly,
    onEdit,
    onRemove,
}: RosterItemProps) {
    return (
        <div
            className={`flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border-2 transition-all group ${
                isEditing
                    ? "border-[#0BD0D9]"
                    : "border-gray-100 hover:shadow-md hover:border-[#0BD0D9]/50"
            }`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">
                        {teacher.firstName} {teacher.lastName}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">
                        {USER_ROLE_LABELS[teacher.userRole] ?? teacher.userRole}
                    </span>
                    {teacher.userRole === "class_teacher" && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-teal-600 rounded-md font-medium">
                            {teacher.advisoryClass}
                        </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded-md font-medium">
                        {PROJECT_ROLE_LABELS[teacher.projectRole] ??
                            teacher.projectRole}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">
                        {teacher.schoolRole}
                    </span>
                    {teacher.email && (
                        <span className="text-xs text-gray-400">
                            • {teacher.email}
                        </span>
                    )}
                </div>
            </div>
            {!readOnly && (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onEdit(teacher)}
                        className="text-gray-300 hover:text-blue-500 transition-all cursor-pointer p-1"
                        title="แก้ไขข้อมูล"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onRemove(
                                teacher.id,
                                `${teacher.firstName} ${teacher.lastName}`,
                            )
                        }
                        className="text-gray-300 hover:text-red-500 transition-all cursor-pointer p-1"
                        title="ลบออกจากรายชื่อครู"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
