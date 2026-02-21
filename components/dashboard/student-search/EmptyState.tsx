import { Search, Users } from "lucide-react";

interface EmptyStateProps {
    hasQuery: boolean;
    isSearching: boolean;
    resultCount: number;
}

export function EmptyState({
    hasQuery,
    isSearching,
    resultCount,
}: EmptyStateProps) {
    if (!hasQuery) {
        return (
            <div className="text-center py-10 text-gray-500 bg-white/30 rounded-2xl border border-white/50 backdrop-blur-sm">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-gray-600">
                    พิมพ์เพื่อค้นหานักเรียน
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    ค้นหาได้ทั้งชื่อ และรหัสนักเรียน
                </p>
            </div>
        );
    }

    if (hasQuery && !isSearching && resultCount === 0) {
        return (
            <div className="text-center py-10 text-gray-500 bg-white/30 rounded-2xl border border-white/50 backdrop-blur-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600">
                    ไม่พบนักเรียน
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    ลองค้นหาด้วยคำอื่น หรือตรวจสอบตัวสะกด
                </p>
            </div>
        );
    }

    return null;
}
