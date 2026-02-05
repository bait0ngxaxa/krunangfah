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

// Allowed file types for worksheet uploads (MIME types)
export const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
];

// Allowed file extensions (whitelist)
export const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

/**
 * Magic bytes signatures for file type validation
 * Verifies actual file content matches claimed type
 */
export const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
    { mime: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
    { mime: "image/png", bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
