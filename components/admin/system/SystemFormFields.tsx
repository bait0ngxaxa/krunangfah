"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export function FormShell({
    children,
    isPending,
    onCancel,
    onSave,
}: {
    children: ReactNode;
    isPending: boolean;
    onCancel: () => void;
    onSave: () => void;
}) {
    return (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">{children}</div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={onCancel}
                >
                    ยกเลิก
                </Button>
                <Button
                    type="button"
                    variant="primary"
                    disabled={isPending}
                    onClick={onSave}
                >
                    <Save className="h-4 w-4" />
                    {isPending ? "กำลังบันทึก" : "บันทึกการแก้ไข"}
                </Button>
            </div>
        </div>
    );
}

export function TextField({
    label,
    value,
    inputMode,
    type = "text",
    onChange,
}: {
    label: string;
    value: string;
    type?: "text" | "date";
    inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-700">
                {label}
            </span>
            <input
                type={type}
                value={value}
                inputMode={inputMode}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-base focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}

export function SelectField({
    label,
    value,
    options,
    disabled = false,
    onChange,
}: {
    label: string;
    value: string;
    options: SelectOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-700">
                {label}
            </span>
            <select
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold text-gray-900 outline-none transition-base focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-50"
            >
                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function ReasonField({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-gray-700">
                เหตุผลการแก้ไข (บังคับ)
            </span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={3}
                placeholder="เช่น ครูแจ้งแก้ไขข้อมูลนำเข้าผิด"
                className="w-full resize-none rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition-base placeholder:text-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}
