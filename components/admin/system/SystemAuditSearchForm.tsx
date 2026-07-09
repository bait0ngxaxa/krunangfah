"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type AuditEventKind = "all" | "edit" | "data-management";

interface AuditSearchFormProps {
    query: string;
    eventKind: AuditEventKind;
    dateFrom: string;
    dateTo: string;
    error: string | null;
    isPending: boolean;
    onQueryChange: (value: string) => void;
    onEventKindChange: (value: AuditEventKind) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onSubmit: () => void;
}

export function AuditSearchForm({
    query,
    eventKind,
    dateFrom,
    dateTo,
    error,
    isPending,
    onQueryChange,
    onEventKindChange,
    onDateFromChange,
    onDateToChange,
    onSubmit,
}: AuditSearchFormProps) {
    return (
        <form
            className="grid gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <AuditQueryInput value={query} onChange={onQueryChange} />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <AuditKindSelect value={eventKind} onChange={onEventKindChange} />
                <Button type="submit" size="sm" disabled={isPending}>
                    <Search className="h-4 w-4" />
                    {isPending ? "กำลังค้นหา" : "ค้นหาประวัติ"}
                </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <DateInput
                    label="ตั้งแต่วันที่"
                    value={dateFrom}
                    onChange={onDateFromChange}
                />
                <DateInput
                    label="ถึงวันที่"
                    value={dateTo}
                    onChange={onDateToChange}
                />
            </div>
            {error ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                </p>
            ) : null}
        </form>
    );
}

function AuditQueryInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="relative">
            <span className="sr-only">ค้นหาประวัติรวม</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
                value={value}
                maxLength={100}
                onChange={(event) => onChange(event.target.value)}
                placeholder="ค้นหาชื่อเป้าหมาย อีเมล เหตุผล หรือ action"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-950 outline-none transition-base placeholder:text-gray-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}

function AuditKindSelect({
    value,
    onChange,
}: {
    value: AuditEventKind;
    onChange: (value: AuditEventKind) => void;
}) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value as AuditEventKind)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none transition-base focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        >
            <option value="all">ทุกประเภทเหตุการณ์</option>
            <option value="edit">การแก้ไขข้อมูล</option>
            <option value="data-management">การจัดการข้อมูล</option>
        </select>
    );
}

function DateInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="grid gap-1 text-xs font-medium text-gray-700">
            {label}
            <input
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none transition-base focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
        </label>
    );
}
