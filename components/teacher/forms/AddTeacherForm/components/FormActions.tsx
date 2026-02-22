import type { FormActionsProps } from "../types";

export function FormActions({
    isLoading,
    onCancel,
}: FormActionsProps): React.ReactNode {
    return (
        <div className="flex gap-4 pt-4 border-t border-emerald-100">
            <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-[#0BD0D9] text-white font-bold rounded-xl hover:bg-[#09B8C0] disabled:opacity-50 transition-all duration-200 shadow-sm"
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        กำลังสร้างคำเชิญ...
                    </span>
                ) : (
                    "สร้างคำเชิญ"
                )}
            </button>
            <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-emerald-200 text-gray-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all font-medium"
            >
                ยกเลิก
            </button>
        </div>
    );
}
