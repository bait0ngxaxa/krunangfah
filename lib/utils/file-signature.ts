/**
 * Magic number (loose signature) validation for uploaded files.
 *
 * Checks the first bytes of a file buffer against known signatures
 * to prevent extension-spoofing attacks (e.g. .exe renamed to .jpg).
 */

// Signature definitions — each is [offset, expectedBytes]
const JPEG_SIGNATURE = new Uint8Array([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
const XLSX_SIGNATURE = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP/PK
const XLS_SIGNATURE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // OLE2

function matchesSignature(buffer: Buffer, signature: Uint8Array): boolean {
    if (buffer.length < signature.length) {
        return false;
    }
    for (let i = 0; i < signature.length; i++) {
        if (buffer.at(i) !== signature.at(i)) {
            return false;
        }
    }
    return true;
}

/**
 * Validate that a file buffer's magic bytes match the expected signature
 * for the given file extension.
 *
 * @returns true if the buffer starts with the correct magic bytes
 */
export function validateFileSignature(buffer: Buffer, extension: string): boolean {
    if (buffer.length === 0) {
        return false;
    }

    switch (extension) {
        case "jpg":
        case "jpeg":
            return matchesSignature(buffer, JPEG_SIGNATURE);
        case "png":
            return matchesSignature(buffer, PNG_SIGNATURE);
        case "pdf":
            return matchesSignature(buffer, PDF_SIGNATURE);
        case "xlsx":
            return matchesSignature(buffer, XLSX_SIGNATURE);
        case "xls":
            return matchesSignature(buffer, XLS_SIGNATURE);
        default:
            // Unknown extension — reject by default
            return false;
    }
}
