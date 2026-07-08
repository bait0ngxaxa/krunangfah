import { Search } from "lucide-react";

interface SearchResultStateProps {
    hasSearched: boolean;
    isPending: boolean;
    resultCount: number;
}

export function SearchResultState({
    hasSearched,
    isPending,
    resultCount,
}: SearchResultStateProps) {
    if (isPending) {
        return (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-800">
                กำลังค้นหาข้อมูล...
            </div>
        );
    }

    if (!hasSearched) {
        return (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-emerald-600" />
                <h2 className="mt-3 text-base font-bold text-gray-900">
                    เริ่มจากค้นหาข้อมูลที่ต้องจัดการ
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-600">
                    หน้านี้จะไม่ดึงรายชื่อทั้งหมดอัตโนมัติ เพื่อกันการเปิดข้อมูลเกินจำเป็นและลดภาระฐานข้อมูล
                </p>
            </div>
        );
    }

    if (resultCount === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
                ไม่พบข้อมูลที่ตรงกับเงื่อนไข
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            พบ {resultCount} รายการ
        </div>
    );
}
