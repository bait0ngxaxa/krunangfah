import type { SubmitButtonProps } from "../types";

export function SubmitButton({
    isLoading,
}: SubmitButtonProps): React.ReactNode {
    return (
        <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-[#0BD0D9] hover:bg-[#09B8C0] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
