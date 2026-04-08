import sharp from "sharp";
import { TARGET_COMPRESSED_IMAGE_SIZE } from "@/lib/constants/image-upload";

const MAX_DIMENSION = 1920;
const PNG_COMPRESSION_LEVEL = 9;
const COMPRESSION_QUALITIES = [80, 70, 60, 50] as const;

type SupportedWorksheetExtension = "jpg" | "jpeg" | "png";
type OutputWorksheetExtension = "jpg" | "png";

export interface CompressedWorksheetImage {
    buffer: Buffer<ArrayBufferLike>;
    extension: OutputWorksheetExtension;
    mimeType: "image/jpeg" | "image/png";
}

export function isSupportedWorksheetImageExtension(
    extension: string,
): extension is SupportedWorksheetExtension {
    return extension === "jpg" || extension === "jpeg" || extension === "png";
}

function buildBasePipeline(inputBuffer: Buffer<ArrayBufferLike>): sharp.Sharp {
    return sharp(inputBuffer, { failOn: "error" })
        .rotate()
        .resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
        });
}

export async function compressWorksheetImageBuffer(
    inputBuffer: Buffer<ArrayBufferLike>,
    extension: SupportedWorksheetExtension,
): Promise<CompressedWorksheetImage> {
    let smallestBuffer: Buffer<ArrayBufferLike> | null = null;

    for (const quality of COMPRESSION_QUALITIES) {
        const buffer =
            extension === "png"
                ? await buildBasePipeline(inputBuffer)
                      .png({
                          compressionLevel: PNG_COMPRESSION_LEVEL,
                          palette: true,
                          quality,
                          effort: 10,
                      })
                      .toBuffer()
                : await buildBasePipeline(inputBuffer)
                      .jpeg({
                          quality,
                          mozjpeg: true,
                      })
                      .toBuffer();

        if (!smallestBuffer || buffer.length < smallestBuffer.length) {
            smallestBuffer = buffer;
        }

        if (buffer.length <= TARGET_COMPRESSED_IMAGE_SIZE) {
            return extension === "png"
                ? {
                      buffer,
                      extension: "png",
                      mimeType: "image/png",
                  }
                : {
                      buffer,
                      extension: "jpg",
                      mimeType: "image/jpeg",
                  };
        }
    }

    const fallbackBuffer = smallestBuffer ?? inputBuffer;
    if (extension === "png") {
        return {
            buffer: fallbackBuffer,
            extension: "png",
            mimeType: "image/png",
        };
    }

    return {
        buffer: fallbackBuffer,
        extension: "jpg",
        mimeType: "image/jpeg",
    };
}
