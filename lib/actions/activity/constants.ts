// Activity configuration constants
import { MAX_IMAGE_UPLOAD_SIZE } from "@/lib/constants/image-upload";

export const ACTIVITY_INDICES: Record<string, number[]> = {
    orange: [1, 2, 3, 4, 5],
    yellow: [1, 2, 3, 5],
    green: [1, 2, 5],
};

// Required number of worksheets per activity
export const REQUIRED_WORKSHEETS: Record<number, number> = {
    1: 2,
    2: 2,
    3: 2,
    4: 2,
    5: 1, // Activity 5 has only 1 worksheet
};

// Allowed file extensions for worksheet uploads (images only)
export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

// Maximum file size after server-side compression (5MB)
export const MAX_FILE_SIZE = MAX_IMAGE_UPLOAD_SIZE;
