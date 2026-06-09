import type { ErrorMessageProps } from "../types";

export function ErrorMessage({ error }: ErrorMessageProps): React.ReactNode {
    if (!error) return null;

    return (
        <div
            role="alert"
            className="break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
        >
            {error}
        </div>
    );
}
