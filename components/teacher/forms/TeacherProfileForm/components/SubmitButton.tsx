import type { SubmitButtonProps } from "../types";
import { buttonVariants } from "@/components/ui/Button";

export function SubmitButton({
    isLoading,
}: SubmitButtonProps): React.ReactNode {
    return (
        <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={buttonVariants({
                variant: "primary",
                fullWidth: true,
                className: "min-w-0 px-4 py-3.5 font-bold shadow-sm",
            })}
        >
            {isLoading ? (
                <span className="flex min-w-0 items-center justify-center gap-2">
                    <span
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-white/50 border-t-white animate-spin"
                        aria-hidden="true"
                    />
                    กำลังบันทึก…
                </span>
            ) : (
                "บันทึกข้อมูล"
            )}
        </button>
    );
}
