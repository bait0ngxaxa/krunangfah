import { logError } from "@/lib/utils/logging";
import type { QueryResult } from "./query-result";

interface ActionErrorOptions<TFallback> {
    context: string;
    error: unknown;
    fallback: TFallback;
}

export function handleActionError<TFallback>({
    context,
    error,
    fallback,
}: ActionErrorOptions<TFallback>): TFallback {
    logError(context, error);
    return fallback;
}

export function handleQueryError<T>(context: string, error: unknown): QueryResult<T> {
    const requestId = crypto.randomUUID();
    logError(`${context} [requestId=${requestId}]`, error);
    return { status: "transient_error", requestId };
}
