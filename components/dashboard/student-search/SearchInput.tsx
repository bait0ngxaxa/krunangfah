import { Search, X } from "lucide-react";

interface SearchInputProps {
    query: string;
    onQueryChange: (value: string) => void;
    isSearching: boolean;
}

export function SearchInput({
    query,
    onQueryChange,
    isSearching,
}: SearchInputProps) {
    return (
        <div className="relative mb-5 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="พิมพ์ชื่อ, นามสกุล หรือรหัสนักเรียน..."
                className="w-full pl-12 pr-12 py-3.5 bg-white/60 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400 shadow-sm hover:shadow-md hover:border-emerald-200 backdrop-blur-sm"
            />
            {isSearching ? (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-100 border-b-emerald-500" />
                </div>
            ) : (
                query && (
                    <button
                        onClick={() => onQueryChange("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all"
                    >
                        <span className="sr-only">Clear</span>
                        <X className="w-4 h-4" />
                    </button>
                )
            )}
        </div>
    );
}
