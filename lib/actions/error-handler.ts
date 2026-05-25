import { logError } from "@/lib/utils/logging";

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
