interface ImportErrorProps {
    error: string | null;
}

/**
 * Error message display
 */
export function ImportError({ error }: ImportErrorProps) {
    if (!error) {
        return null;
    }

    return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
        </div>
    );
}
