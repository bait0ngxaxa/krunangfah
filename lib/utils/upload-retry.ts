export const UPLOAD_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 750;

export interface RetryableUploadResult {
    success: boolean;
    retryable?: boolean;
}

export interface UploadRetryState {
    attempt: number;
    maxAttempts: number;
}

function getRetryDelayMs(attempt: number): number {
    const exponentialDelay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * RETRY_BASE_DELAY_MS);
    return exponentialDelay + jitter;
}

function wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        globalThis.setTimeout(resolve, delayMs);
    });
}

export async function retryUpload<T extends RetryableUploadResult>(
    operation: () => Promise<T>,
    onRetry?: (state: UploadRetryState) => void,
): Promise<T> {
    for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt++) {
        try {
            const result = await operation();
            if (
                result.success ||
                !result.retryable ||
                attempt === UPLOAD_MAX_ATTEMPTS
            ) {
                return result;
            }
        } catch (error) {
            if (attempt === UPLOAD_MAX_ATTEMPTS) {
                throw error;
            }
        }

        const nextAttempt = attempt + 1;
        onRetry?.({ attempt: nextAttempt, maxAttempts: UPLOAD_MAX_ATTEMPTS });
        await wait(getRetryDelayMs(attempt));
    }

    throw new Error("ไม่สามารถอัปโหลดไฟล์ได้");
}
