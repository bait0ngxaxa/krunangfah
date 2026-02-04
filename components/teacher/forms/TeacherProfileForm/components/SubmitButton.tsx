import type { SubmitButtonProps } from "../types";

export function SubmitButton({
    isLoading,
}: SubmitButtonProps): React.ReactNode {
    return (
        <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-linear-to-r from-rose-400 to-pink-500 text-white font-bold rounded-xl hover:from-rose-500 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 transform hover:-translate-y-0.5"
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก...
                </span>
            ) : (
                "บันทึกข้อมูล"
            )}
        </button>
    );
}
