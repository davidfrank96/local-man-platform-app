import type { VendorFeaturedDish, VendorHours, VendorImage } from "../../types/index.ts";

export type VendorCreateIntentErrors = Partial<Record<
  "hours" | "featured_dishes" | "images",
  string
>>;

function readCreateVendorImageFile(formData: FormData): File | null {
  const image = formData.get("create-image");

  return image instanceof File && image.size > 0 ? image : null;
}

function hasCreateVendorHoursInput(formData: FormData): boolean {
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    if (formData.get(`create-closed-${dayOfWeek}`) === "on") {
      return true;
    }

    const openValue = String(formData.get(`create-open-${dayOfWeek}`) ?? "").trim();
    const closeValue = String(formData.get(`create-close-${dayOfWeek}`) ?? "").trim();

    if (openValue.length > 0 || closeValue.length > 0) {
      return true;
    }
  }

  return false;
}

function hasCreateVendorDishInput(formData: FormData): boolean {
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("create-dish-name-")) {
      continue;
    }

    if (String(value).trim().length > 0) {
      return true;
    }
  }

  return false;
}

export function validateVendorCreateIntent(formData: FormData): VendorCreateIntentErrors {
  const errors: VendorCreateIntentErrors = {};

  if (!hasCreateVendorHoursInput(formData) && formData.get("missing-hours-acknowledged") !== "on") {
    errors.hours = "Confirm that opening hours will be added later.";
  }

  if (
    !hasCreateVendorDishInput(formData) &&
    formData.get("missing-featured-dishes-acknowledged") !== "on"
  ) {
    errors.featured_dishes = "Confirm that featured dishes will be added later.";
  }

  if (!readCreateVendorImageFile(formData) && formData.get("missing-images-acknowledged") !== "on") {
    errors.images = "Confirm that vendor images will be added later.";
  }

  return errors;
}

export function extractCreateVendorImageUpload(formData: FormData): FormData | null {
  const image = readCreateVendorImageFile(formData);

  if (!image) {
    return null;
  }

  const uploadData = new FormData();
  uploadData.set("image", image);
  uploadData.set("sort_order", String(formData.get("create-image-sort-order") ?? "0"));

  return uploadData;
}

export function getVendorCompletenessLabels(input: {
  hours: VendorHours[];
  images: VendorImage[];
  dishes: VendorFeaturedDish[];
}): string[] {
  const labels: string[] = [];

  if (input.hours.length === 0) {
    labels.push("Missing hours");
  }

  if (input.images.length === 0) {
    labels.push("Missing images");
  }

  if (input.dishes.length === 0) {
    labels.push("Missing featured dishes");
  }

  return labels;
}
