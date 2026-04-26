import type { VendorImage } from "../../types/index.ts";

export function isSeedPlaceholderUrl(imageUrl: string): boolean {
  return imageUrl.startsWith("/seed-images/");
}

export function buildVendorImagePublicUrl(baseUrl: string, storageObjectPath: string): string {
  return new URL(
    `/storage/v1/object/public/vendor-images/${storageObjectPath}`,
    baseUrl,
  ).toString();
}

export function normalizeVendorImageRow(
  baseUrl: string,
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const storageObjectPath =
    typeof row.storage_object_path === "string" && row.storage_object_path.trim().length > 0
      ? row.storage_object_path.trim()
      : null;

  if (!storageObjectPath) {
    return null;
  }

  return {
    ...row,
    image_url: buildVendorImagePublicUrl(baseUrl, storageObjectPath),
    storage_object_path: storageObjectPath,
  };
}

export function normalizeVendorImageRows(baseUrl: string, payload: unknown): unknown {
  if (!Array.isArray(payload)) {
    return payload;
  }

  return payload.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [row];
    }

    const normalizedRow = normalizeVendorImageRow(
      baseUrl,
      row as Record<string, unknown>,
    );

    return normalizedRow ? [normalizedRow] : [];
  });
}

export function selectPrimaryVendorImage(images: VendorImage[]): VendorImage | null {
  return images.find((image) => !isSeedPlaceholderUrl(image.image_url)) ?? images[0] ?? null;
}
