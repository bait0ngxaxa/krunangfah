/**
 * Client-side image compression using Canvas API.
 * Reduces upload size ~60-80% for phone camera photos (3-8MB → <1MB).
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
const COMPRESSIBLE_TYPES: ReadonlySet<string> = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
    });
}

function calculateDimensions(
    width: number,
    height: number,
): { width: number; height: number } {
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        return { width, height };
    }

    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas toBlob failed"));
                }
            },
            type,
            quality,
        );
    });
}

function replaceExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf(".");
    const baseName = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
    return `${baseName}.jpg`;
}

/**
 * Compress an image file using Canvas API before upload.
 *
 * - Non-image files (PDF, etc.) are returned unchanged.
 * - Images are resized to max 1920px and converted to JPEG quality 0.8.
 * - If the compressed result is larger than the original, the original is returned.
 */
export async function compressImage(file: File): Promise<File> {
    if (!COMPRESSIBLE_TYPES.has(file.type)) {
        return file;
    }

    const img = await loadImage(file);
    const { width, height } = calculateDimensions(
        img.naturalWidth,
        img.naturalHeight,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return file;
    }

    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(img.src);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);

    // If compressed is larger, return original
    if (blob.size >= file.size) {
        return file;
    }

    return new File([blob], replaceExtension(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
    });
}
