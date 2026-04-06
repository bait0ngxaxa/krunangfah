import type { SubmitButtonProps } from "../types";
import { buttonVariants } from "@/components/ui/Button";

export function SubmitButton({
    isLoading,
}: SubmitButtonProps): React.ReactNode {
    return (
        <button
            type="submit"
            disabled={isLoading}
            className={buttonVariants({
                variant: "primary",
                fullWidth: true,
                className: "py-3.5 px-4 font-bold shadow-sm",
            })}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก…
                </span>
            ) : (
                "บันทึกข้อมูล"
            )}
        </button>
    );
}
