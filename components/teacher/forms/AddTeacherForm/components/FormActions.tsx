import type { FormActionsProps } from "../types";

export function FormActions({
    isLoading,
    onCancel,
}: FormActionsProps): React.ReactNode {
    return (
        <div className="flex gap-4">
            <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-linear-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
            >
                {isLoading ? "กำลังสร้างคำเชิญ..." : "สร้างคำเชิญ"}
            </button>
            <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
                ยกเลิก
            </button>
        </div>
    );
}
