import { Search, X } from "lucide-react";

interface SearchInputProps {
    query: string;
    onQueryChange: (value: string) => void;
    isSearching: boolean;
    canSearchNationalId?: boolean;
}

export function SearchInput({
    query,
    onQueryChange,
    isSearching,
    canSearchNationalId = false,
}: SearchInputProps) {
    const placeholder = canSearchNationalId
        ? "พิมพ์ชื่อ, นามสกุล, รหัสนักเรียน หรือเลขบัตรประชาชน..."
        : "พิมพ์ชื่อ, นามสกุล หรือรหัสนักเรียน...";

    return (
        <div className="group relative mb-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search
                    className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500"
                    aria-hidden="true"
                />
            </div>
            <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                aria-label={placeholder}
                placeholder={placeholder}
                maxLength={100}
                autoComplete="off"
                className="w-full rounded-xl border border-emerald-100 bg-white/60 py-3.5 pl-12 pr-14 text-sm text-gray-800 shadow-sm outline-none backdrop-blur-sm transition-base hover:border-emerald-200 hover:shadow-md focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 placeholder:text-gray-500"
            />
            {isSearching ? (
                <div
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    role="status"
                    aria-live="polite"
                    aria-label="กำลังค้นหา"
                >
                    <div
                        className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-100 border-b-emerald-500"
                        aria-hidden="true"
                    />
                </div>
            ) : (
                query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange("")}
                        className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-base hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                        <span className="sr-only">ล้างคำค้นหา</span>
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                )
            )}
        </div>
    );
}
