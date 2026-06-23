import { describe, expect, it, vi } from "vitest";
import { retryUpload } from "@/lib/utils/upload-retry";

describe("retryUpload", () => {
    it("retries a retryable failure and returns its successful result", async () => {
        const operation = vi
            .fn<() => Promise<{ success: boolean; retryable?: boolean }>>()
            .mockResolvedValueOnce({ success: false, retryable: true })
            .mockResolvedValueOnce({ success: true });
        const onRetry = vi.fn();

        const result = await retryUpload(operation, onRetry);

        expect(result).toEqual({ success: true });
        expect(operation).toHaveBeenCalledTimes(2);
        expect(onRetry).toHaveBeenCalledWith({ attempt: 2, maxAttempts: 3 });
    });

    it("does not retry a non-retryable failure", async () => {
        const operation = vi.fn().mockResolvedValue({
            success: false,
            retryable: false,
        });

        const result = await retryUpload(operation);

        expect(result).toEqual({ success: false, retryable: false });
        expect(operation).toHaveBeenCalledTimes(1);
    });
});
