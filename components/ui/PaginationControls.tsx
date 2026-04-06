import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPrevious: () => void;
    onNext: () => void;
    className?: string;
}

export function PaginationControls({
    currentPage,
    totalPages,
    onPrevious,
    onNext,
    className,
}: PaginationControlsProps) {
    return (
        <div className={className}>
            <button
                type="button"
                onClick={onPrevious}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="w-3.5 h-3.5" />
                ก่อนหน้า
            </button>
            <span className="text-xs font-bold text-gray-700 px-1.5">
                {currentPage} / {totalPages}
            </span>
            <button
                type="button"
                onClick={onNext}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                ถัดไป
                <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
