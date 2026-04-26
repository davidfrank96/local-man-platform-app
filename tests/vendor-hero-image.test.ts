import assert from "node:assert/strict";
import test from "node:test";
import { selectPrimaryVendorImage } from "../lib/vendors/images.ts";
import type { VendorImage } from "../types/index.ts";

const timestamp = "2026-04-22T00:00:00+00:00";

function createImage(
  overrides: Partial<VendorImage> = {},
): VendorImage {
  return {
    id: "50000000-0000-4000-8000-000000000001",
    vendor_id: "00000000-0000-4000-8000-000000000001",
    image_url: "/seed-images/vendors/test/cover.jpg",
    storage_object_path: null,
    sort_order: 0,
    created_at: timestamp,
    ...overrides,
  };
}

test("prefers uploaded or external vendor images over seed placeholders", () => {
  const selectedImage = selectPrimaryVendorImage([
    createImage(),
    createImage({
      id: "50000000-0000-4000-8000-000000000002",
      image_url:
        "https://example.supabase.co/storage/v1/object/public/vendor-images/test/hero.jpg",
      storage_object_path: "test/hero.jpg",
      sort_order: 1,
    }),
  ]);

  assert.equal(
    selectedImage?.image_url,
    "https://example.supabase.co/storage/v1/object/public/vendor-images/test/hero.jpg",
  );
});

test("falls back to the first image when no non-placeholder image exists", () => {
  const selectedImage = selectPrimaryVendorImage([createImage()]);

  assert.equal(selectedImage?.image_url, "/seed-images/vendors/test/cover.jpg");
});
