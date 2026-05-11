import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { AdminServiceError } from "../lib/admin/errors.ts";
import {
  getImageExtensionForMimeType,
  optimizeVendorImageUpload,
  VENDOR_IMAGE_MAX_OUTPUT_DIMENSION_PX,
} from "../lib/admin/image-optimization.ts";

async function createJpegFixture(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#8f1523",
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();

  return new Uint8Array(buffer);
}

test("optimizes oversized JPEG uploads to bounded WebP output", async () => {
  const input = await createJpegFixture(2200, 1600);
  const result = await optimizeVendorImageUpload({
    fileBytes: input,
    declaredMimeType: "image/jpeg",
  });

  assert.equal(result.outputMimeType, "image/webp");
  assert.equal(result.outputExtension, "webp");
  assert.equal(result.optimizationApplied, true);
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.originalWidth, 2200);
  assert.equal(result.originalHeight, 1600);
  assert.ok((result.width ?? 0) <= VENDOR_IMAGE_MAX_OUTPUT_DIMENSION_PX);
  assert.ok((result.height ?? 0) <= VENDOR_IMAGE_MAX_OUTPUT_DIMENSION_PX);
  assert.ok(result.optimizedSizeBytes < result.originalSizeBytes);
});

test("keeps the original safe image when optimized output is larger", async () => {
  const input = await createJpegFixture(80, 80);
  const result = await optimizeVendorImageUpload(
    {
      fileBytes: input,
      declaredMimeType: "image/jpeg",
    },
    {
      transformImage: async () => ({
        bytes: new Uint8Array(input.byteLength + 10),
        width: 80,
        height: 80,
      }),
    },
  );

  assert.equal(result.outputMimeType, "image/jpeg");
  assert.equal(result.outputExtension, "jpg");
  assert.equal(result.optimizationApplied, false);
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.optimizedSizeBytes, input.byteLength);
  assert.deepEqual(result.bytes, input);
});

test("falls back to the original safe image when transform fails after validation", async () => {
  const input = await createJpegFixture(400, 300);
  const result = await optimizeVendorImageUpload(
    {
      fileBytes: input,
      declaredMimeType: "image/jpeg",
    },
    {
      transformImage: async () => {
        throw new Error("simulated sharp transform failure");
      },
    },
  );

  assert.equal(result.outputMimeType, "image/jpeg");
  assert.equal(result.outputExtension, "jpg");
  assert.equal(result.optimizationApplied, false);
  assert.equal(result.fallbackUsed, true);
  assert.deepEqual(result.bytes, input);
});

test("rejects corrupt image bytes cleanly", async () => {
  await assert.rejects(
    () => optimizeVendorImageUpload({
      fileBytes: Uint8Array.from([1, 2, 3, 4]),
      declaredMimeType: "image/jpeg",
    }),
    (error: unknown) => {
      assert.equal(error instanceof AdminServiceError, true);
      assert.equal((error as AdminServiceError).code, "VALIDATION_ERROR");
      assert.equal((error as AdminServiceError).status, 400);
      return true;
    },
  );
});

test("maps image MIME types to storage extensions", () => {
  assert.equal(getImageExtensionForMimeType("image/jpeg"), "jpg");
  assert.equal(getImageExtensionForMimeType("image/png"), "png");
  assert.equal(getImageExtensionForMimeType("image/webp"), "webp");
});
