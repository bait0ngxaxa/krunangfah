import { Search, Users } from "lucide-react";

interface EmptyStateProps {
    hasQuery: boolean;
    isSearching: boolean;
    hasError: boolean;
    resultCount: number;
}

export function EmptyState({
    hasQuery,
    isSearching,
    hasError,
    resultCount,
}: EmptyStateProps) {
    if (hasError) {
        return (
            <div
                className="rounded-2xl border border-red-100 bg-red-50/70 px-5 py-8 text-center text-red-700 backdrop-blur-sm"
                role="status"
            >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
                    <Search className="h-7 w-7 text-red-500" />
                </div>
                <p className="break-words text-sm font-semibold">
                    ค้นหานักเรียนไม่สำเร็จ
                </p>
                <p className="mt-1 break-words text-xs text-red-600">
                    กรุณาตรวจสอบการเชื่อมต่อ แล้วลองพิมพ์ค้นหาอีกครั้ง
                </p>
            </div>
        );
    }

    if (!hasQuery) {
        return (
            <div className="rounded-2xl border border-white/50 bg-white/30 py-10 text-center text-gray-500 backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                    <Search className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="break-words text-sm font-semibold text-gray-600">
                    พิมพ์เพื่อค้นหานักเรียน
                </p>
                <p className="mt-1 break-words text-xs text-gray-500">
                    ค้นหาได้ทั้งชื่อ และรหัสนักเรียน
                </p>
            </div>
        );
    }

    if (hasQuery && !isSearching && resultCount === 0) {
        return (
            <div className="rounded-2xl border border-white/50 bg-white/30 py-10 text-center text-gray-500 backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                    <Users className="h-7 w-7 text-gray-300" />
                </div>
                <p className="break-words text-sm font-semibold text-gray-600">
                    ไม่พบนักเรียน
                </p>
                <p className="mt-1 break-words text-xs text-gray-500">
                    ลองค้นหาด้วยคำอื่น หรือตรวจสอบตัวสะกด
                </p>
            </div>
        );
    }

    return null;
}
