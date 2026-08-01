import { logError } from "@/lib/utils/logging";
import { unstable_rethrow } from "next/navigation";
import { QUERY_ERROR_MESSAGE, type QueryResult } from "./query-result";

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
    unstable_rethrow(error);
    logError(context, error);
    return fallback;
}

export function handleQueryError<T>(context: string, error: unknown): QueryResult<T> {
    unstable_rethrow(error);
    const requestId = crypto.randomUUID();
    logError(`${context} [requestId=${requestId}]`, error);
    return {
        status: "transient_error",
        requestId,
        message: QUERY_ERROR_MESSAGE,
    };
}
