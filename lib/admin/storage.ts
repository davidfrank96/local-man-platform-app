import { AdminServiceError } from "./errors.ts";
import type { AdminAuthConfig, AdminSession } from "./auth.ts";

export const VENDOR_IMAGE_BUCKET = "vendor-images";
export const MAX_VENDOR_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function validateVendorImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size <= 0) {
    return "Image file is empty.";
  }

  if (file.size > MAX_VENDOR_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }

  return null;
}

export function getVendorImageExtension(file: File): string {
  const extension = IMAGE_MIME_TYPES.get(file.type);

  if (!extension) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unsupported vendor image file type.",
      502,
    );
  }

  return extension;
}

export function buildVendorImageStoragePath(
  vendorId: string,
  imageId: string,
  file: File,
): string {
  return `vendors/${vendorId}/${imageId}.${getVendorImageExtension(file)}`;
}

export function buildVendorImagePublicUrl(
  config: AdminAuthConfig,
  storageObjectPath: string,
): string {
  return new URL(
    `/storage/v1/object/public/${VENDOR_IMAGE_BUCKET}/${storageObjectPath}`,
    config.supabaseUrl,
  ).toString();
}

async function readStorageResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function uploadVendorImageObject(
  {
    config,
    session,
    storageObjectPath,
    file,
    fetchImpl = fetch,
  }: {
    config: AdminAuthConfig;
    session: AdminSession;
    storageObjectPath: string;
    file: File;
    fetchImpl?: typeof fetch;
  },
): Promise<void> {
  const response = await fetchImpl(
    new URL(
      `/storage/v1/object/${VENDOR_IMAGE_BUCKET}/${storageObjectPath}`,
      config.supabaseUrl,
    ),
    {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${session.accessToken}`,
        "content-type": file.type,
        "x-upsert": "true",
      },
      body: await file.arrayBuffer(),
    },
  );

  if (!response.ok) {
    const payload = await readStorageResponse(response);

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unable to upload vendor image.",
      502,
      payload,
    );
  }
}

export async function deleteVendorImageObject(
  {
    config,
    session,
    storageObjectPath,
    fetchImpl = fetch,
  }: {
    config: AdminAuthConfig;
    session: AdminSession;
    storageObjectPath: string;
    fetchImpl?: typeof fetch;
  },
): Promise<void> {
  const response = await fetchImpl(
    new URL(
      `/storage/v1/object/${VENDOR_IMAGE_BUCKET}/${storageObjectPath}`,
      config.supabaseUrl,
    ),
    {
      method: "DELETE",
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const payload = await readStorageResponse(response);

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unable to delete vendor image.",
      502,
      payload,
    );
  }
}
