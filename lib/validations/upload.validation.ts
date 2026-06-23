import { z } from "zod";

export const uploadRequestIdSchema = z.string().uuid();

export function getUploadRequestId(formData: FormData): string | null {
    const result = uploadRequestIdSchema.safeParse(
        formData.get("uploadRequestId"),
    );

    return result.success ? result.data : null;
}
