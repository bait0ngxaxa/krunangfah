import type { ErrorMessageProps } from "../types";

export function ErrorMessage({ error }: ErrorMessageProps): React.ReactNode {
    if (!error) return null;

    return (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
        </div>
    );
}
