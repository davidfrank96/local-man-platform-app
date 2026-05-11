import sharp, { type Metadata } from "sharp";
import { AdminServiceError } from "./errors.ts";

export const VENDOR_IMAGE_MAX_OUTPUT_DIMENSION_PX = 1200;
export const VENDOR_IMAGE_OUTPUT_QUALITY = 80;

const VENDOR_IMAGE_MAX_INPUT_PIXELS = 60_000_000;
const SUPPORTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
const IMAGE_FORMAT_MIME_TYPES = new Map([
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);
const IMAGE_MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type OptimizedVendorImageUpload = {
  bytes: Uint8Array;
  outputMimeType: string;
  outputExtension: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  originalWidth: number | null;
  originalHeight: number | null;
  width: number | null;
  height: number | null;
  optimizationApplied: boolean;
  fallbackUsed: boolean;
};

type ImageTransformResult = {
  bytes: Uint8Array;
  width: number | null;
  height: number | null;
};

type OptimizeVendorImageUploadOptions = {
  maxDimensionPx?: number;
  quality?: number;
  transformImage?: (
    input: {
      fileBytes: Uint8Array;
      maxDimensionPx: number;
      quality: number;
    },
  ) => Promise<ImageTransformResult>;
};

function normalizeImageFormat(format: string | undefined): string | null {
  if (!format) {
    return null;
  }

  const normalized = format.trim().toLowerCase();
  return normalized === "jpg" ? "jpeg" : normalized;
}

export function getImageExtensionForMimeType(mimeType: string): string {
  const extension = IMAGE_MIME_EXTENSIONS.get(mimeType);

  if (!extension) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Image format is not supported.",
      400,
      { mime_type: mimeType },
    );
  }

  return extension;
}

function toUint8Array(buffer: Uint8Array): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function readImageMetadata(fileBytes: Uint8Array): Promise<Metadata> {
  try {
    return await sharp(Buffer.from(fileBytes), {
      failOn: "none",
      limitInputPixels: VENDOR_IMAGE_MAX_INPUT_PIXELS,
    }).metadata();
  } catch (error) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Image file is corrupt or is not a supported image.",
      400,
      {
        reason: "metadata_read_failed",
        error_name: error instanceof Error ? error.name : null,
      },
      "Upload a valid JPEG, PNG, or WebP image.",
    );
  }
}

async function transformImageWithSharp({
  fileBytes,
  maxDimensionPx,
  quality,
}: {
  fileBytes: Uint8Array;
  maxDimensionPx: number;
  quality: number;
}): Promise<ImageTransformResult> {
  const result = await sharp(Buffer.from(fileBytes), {
    failOn: "none",
    limitInputPixels: VENDOR_IMAGE_MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: maxDimensionPx,
      height: maxDimensionPx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 4,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: toUint8Array(result.data),
    width: result.info.width ?? null,
    height: result.info.height ?? null,
  };
}

export async function optimizeVendorImageUpload(
  {
    fileBytes,
    declaredMimeType,
  }: {
    fileBytes: Uint8Array;
    declaredMimeType: string;
  },
  options: OptimizeVendorImageUploadOptions = {},
): Promise<OptimizedVendorImageUpload> {
  const originalSizeBytes = fileBytes.byteLength;
  const metadata = await readImageMetadata(fileBytes);
  const sourceFormat = normalizeImageFormat(metadata.format);

  if (!sourceFormat || !SUPPORTED_IMAGE_FORMATS.has(sourceFormat)) {
    throw new AdminServiceError(
      "VALIDATION_ERROR",
      "Image file is not a valid JPEG, PNG, or WebP image.",
      400,
      {
        detected_format: metadata.format ?? null,
        declared_mime_type: declaredMimeType,
      },
      "Upload a valid JPEG, PNG, or WebP image.",
    );
  }

  const originalMimeType = IMAGE_FORMAT_MIME_TYPES.get(sourceFormat) ?? declaredMimeType;
  const originalExtension = getImageExtensionForMimeType(originalMimeType);
  const originalWidth = metadata.width ?? null;
  const originalHeight = metadata.height ?? null;
  const transformImage = options.transformImage ?? transformImageWithSharp;

  try {
    const candidate = await transformImage({
      fileBytes,
      maxDimensionPx: options.maxDimensionPx ?? VENDOR_IMAGE_MAX_OUTPUT_DIMENSION_PX,
      quality: options.quality ?? VENDOR_IMAGE_OUTPUT_QUALITY,
    });

    if (candidate.bytes.byteLength > 0 && candidate.bytes.byteLength < originalSizeBytes) {
      return {
        bytes: candidate.bytes,
        outputMimeType: "image/webp",
        outputExtension: "webp",
        originalSizeBytes,
        optimizedSizeBytes: candidate.bytes.byteLength,
        originalWidth,
        originalHeight,
        width: candidate.width,
        height: candidate.height,
        optimizationApplied: true,
        fallbackUsed: false,
      };
    }
  } catch {
    return {
      bytes: fileBytes,
      outputMimeType: originalMimeType,
      outputExtension: originalExtension,
      originalSizeBytes,
      optimizedSizeBytes: originalSizeBytes,
      originalWidth,
      originalHeight,
      width: originalWidth,
      height: originalHeight,
      optimizationApplied: false,
      fallbackUsed: true,
    };
  }

  return {
    bytes: fileBytes,
    outputMimeType: originalMimeType,
    outputExtension: originalExtension,
    originalSizeBytes,
    optimizedSizeBytes: originalSizeBytes,
    originalWidth,
    originalHeight,
    width: originalWidth,
    height: originalHeight,
    optimizationApplied: false,
    fallbackUsed: false,
  };
}
