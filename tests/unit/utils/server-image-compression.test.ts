import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
    compressWorksheetImageBuffer,
    isSupportedWorksheetImageExtension,
} from "@/lib/utils/server-image-compression";
import { TARGET_COMPRESSED_IMAGE_SIZE } from "@/lib/constants/image-upload";

async function createSolidJpegBuffer(
    width: number,
    height: number,
): Promise<Buffer> {
    return sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 74, g: 144, b: 226 },
        },
    })
        .jpeg({ quality: 100 })
        .toBuffer();
}

async function createSolidPngBuffer(
    width: number,
    height: number,
): Promise<Buffer> {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 12, g: 161, b: 95, alpha: 0.85 },
        },
    })
        .png({ compressionLevel: 0 })
        .toBuffer();
}

describe("server-image-compression", () => {
    describe("isSupportedWorksheetImageExtension", () => {
        it("accepts jpg/jpeg/png", () => {
            expect(isSupportedWorksheetImageExtension("jpg")).toBe(true);
            expect(isSupportedWorksheetImageExtension("jpeg")).toBe(true);
            expect(isSupportedWorksheetImageExtension("png")).toBe(true);
        });

        it("rejects unsupported extensions", () => {
            expect(isSupportedWorksheetImageExtension("pdf")).toBe(false);
            expect(isSupportedWorksheetImageExtension("webp")).toBe(false);
            expect(isSupportedWorksheetImageExtension("gif")).toBe(false);
        });
    });

    describe("compressWorksheetImageBuffer", () => {
        it("compresses jpeg and keeps output contract", async () => {
            const input = await createSolidJpegBuffer(4200, 3200);
            const result = await compressWorksheetImageBuffer(input, "jpeg");
            const metadata = await sharp(result.buffer).metadata();

            expect(result.extension).toBe("jpg");
            expect(result.mimeType).toBe("image/jpeg");
            expect(result.buffer.length).toBeGreaterThan(0);
            expect(metadata.width ?? 0).toBeLessThanOrEqual(1920);
            expect(metadata.height ?? 0).toBeLessThanOrEqual(1920);
            expect(result.buffer.length).toBeLessThanOrEqual(
                TARGET_COMPRESSED_IMAGE_SIZE,
            );
        });

        it("compresses png and keeps output contract", async () => {
            const input = await createSolidPngBuffer(3600, 2800);
            const result = await compressWorksheetImageBuffer(input, "png");
            const metadata = await sharp(result.buffer).metadata();

            expect(result.extension).toBe("png");
            expect(result.mimeType).toBe("image/png");
            expect(result.buffer.length).toBeGreaterThan(0);
            expect(metadata.width ?? 0).toBeLessThanOrEqual(1920);
            expect(metadata.height ?? 0).toBeLessThanOrEqual(1920);
            expect(result.buffer.length).toBeLessThanOrEqual(
                TARGET_COMPRESSED_IMAGE_SIZE,
            );
        });

        it("treats jpg alias as jpeg output", async () => {
            const input = await createSolidJpegBuffer(3000, 2400);
            const result = await compressWorksheetImageBuffer(input, "jpg");

            expect(result.extension).toBe("jpg");
            expect(result.mimeType).toBe("image/jpeg");
            expect(result.buffer.length).toBeGreaterThan(0);
        });
    });
});
