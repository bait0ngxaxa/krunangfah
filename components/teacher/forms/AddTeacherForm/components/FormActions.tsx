import type { FormActionsProps } from "../types";

export function FormActions({
    isLoading,
    onCancel,
}: FormActionsProps): React.ReactNode {
    return (
        <div className="flex gap-4 pt-4 border-t border-pink-100">
            <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-linear-to-r from-rose-400 to-pink-500 text-white font-bold rounded-xl hover:from-rose-500 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 transform hover:-translate-y-0.5"
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
                className="px-6 py-3 border border-pink-200 text-gray-600 rounded-xl hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 transition-all font-medium"
            >
                ยกเลิก
            </button>
        </div>
    );
}
