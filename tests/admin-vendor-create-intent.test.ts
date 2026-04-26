import assert from "node:assert/strict";
import test from "node:test";
import {
  extractCreateVendorImageUpload,
  getVendorCompletenessLabels,
  validateVendorCreateIntent,
} from "../lib/admin/vendor-create-intent.ts";

const timestamp = "2026-04-22T00:00:00+00:00";
const vendorId = "00000000-0000-4000-8000-000000000001";

test("creating a vendor without acknowledgements returns inline intent errors", () => {
  const formData = new FormData();
  const errors = validateVendorCreateIntent(formData);

  assert.deepEqual(errors, {
    hours: "Confirm that opening hours will be added later.",
    featured_dishes: "Confirm that featured dishes will be added later.",
    images: "Confirm that vendor images will be added later.",
  });
});

test("creating a vendor with acknowledgements passes intent validation", () => {
  const formData = new FormData();
  formData.set("missing-hours-acknowledged", "on");
  formData.set("missing-featured-dishes-acknowledged", "on");
  formData.set("missing-images-acknowledged", "on");

  assert.deepEqual(validateVendorCreateIntent(formData), {});
});

test("creating a vendor with an image does not require the missing-image acknowledgement", async () => {
  const formData = new FormData();
  formData.set("missing-hours-acknowledged", "on");
  formData.set("missing-featured-dishes-acknowledged", "on");
  formData.set(
    "create-image",
    new File([Uint8Array.from([1, 2, 3])], "cover.jpg", { type: "image/jpeg" }),
  );
  formData.set("create-image-sort-order", "2");

  assert.deepEqual(validateVendorCreateIntent(formData), {});

  const upload = extractCreateVendorImageUpload(formData);

  assert.ok(upload);
  assert.equal(upload.get("sort_order"), "2");
  assert.ok(upload.get("image") instanceof File);
});

test("creating a vendor with hours does not require the missing-hours acknowledgement", () => {
  const formData = new FormData();
  formData.set("missing-featured-dishes-acknowledged", "on");
  formData.set("missing-images-acknowledged", "on");
  formData.set("create-open-1", "9 AM");
  formData.set("create-close-1", "6 PM");

  assert.deepEqual(validateVendorCreateIntent(formData), {});
});

test("creating a vendor with featured dishes does not require the missing-dishes acknowledgement", () => {
  const formData = new FormData();
  formData.set("missing-hours-acknowledged", "on");
  formData.set("missing-images-acknowledged", "on");
  formData.set("create-dish-name-0", "Jollof rice");

  assert.deepEqual(validateVendorCreateIntent(formData), {});
});

test("creating a vendor without an image produces no upload payload", () => {
  const formData = new FormData();

  assert.equal(extractCreateVendorImageUpload(formData), null);
});

test("completeness labels mark missing vendor subrecords", () => {
  const labels = getVendorCompletenessLabels({
    hours: [],
    images: [],
    dishes: [],
  });

  assert.deepEqual(labels, [
    "Missing hours",
    "Missing images",
    "Missing featured dishes",
  ]);
});

test("completeness labels clear after missing vendor data is added", () => {
  const labels = getVendorCompletenessLabels({
    hours: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        vendor_id: vendorId,
        day_of_week: 1,
        open_time: "09:00",
        close_time: "18:00",
        is_closed: false,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    images: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        vendor_id: vendorId,
        image_url: "https://example.com/vendor.jpg",
        storage_object_path: null,
        sort_order: 0,
        created_at: timestamp,
      },
    ],
    dishes: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        vendor_id: vendorId,
        dish_name: "Yam stew",
        description: null,
        image_url: null,
        is_featured: true,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
  });

  assert.deepEqual(labels, []);
});
