import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ImportErrorModalProps {
    error: string | null;
    title: string;
    description: string;
    onClose: () => void;
}

/**
 * Blocking error modal for failed student imports.
 */
export function ImportErrorModal({
    error,
    title,
    description,
    onClose,
}: ImportErrorModalProps) {
    if (!error) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            style={{ overscrollBehavior: "contain" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.65)]"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="import-error-title"
                aria-describedby="import-error-message"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-red-100 bg-red-50 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <h3
                                id="import-error-title"
                                className="text-base font-bold text-red-700"
                            >
                                {title}
                            </h3>
                            <p className="mt-1 text-sm text-red-600">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="space-y-5 px-6 py-5">
                    <p
                        id="import-error-message"
                        className="max-h-[45vh] overflow-y-auto rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-700 whitespace-pre-line"
                    >
                        {error}
                    </p>
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="danger"
                            size="md"
                            className="min-w-28"
                        >
                            รับทราบ
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
