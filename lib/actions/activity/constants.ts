// Activity configuration constants

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

// Allowed file extensions for worksheet uploads (whitelist)
export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
