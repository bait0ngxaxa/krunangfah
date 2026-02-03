import type { SubmitButtonProps } from "../types";

export function SubmitButton({ isLoading }: SubmitButtonProps): React.ReactNode {
    return (
        <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-linear-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
            {isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </button>
    );
}
