import { AdminServiceError } from "./errors.ts";
import type { AdminAuthConfig, AdminSession } from "./auth.ts";
import { logStructuredEvent } from "../observability.ts";
import { getImageExtensionForMimeType } from "./image-optimization.ts";

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

export function getVendorImageExtension(file: Pick<File, "type">): string {
  return getImageExtensionForMimeType(file.type);
}

function sanitizeVendorImageStem(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").trim().toLowerCase();
  const sanitized = stem
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return sanitized || "vendor-image";
}

export function buildVendorImageStoragePath(
  vendorId: string,
  imageId: string,
  file: Pick<File, "name" | "type">,
): string {
  const extension = getVendorImageExtension(file);
  const sanitizedStem = sanitizeVendorImageStem(file.name);

  return `${vendorId}/${imageId}-${sanitizedStem}.${extension}`;
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

type AdminStorageConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

function requireAdminStorageConfig(config: AdminAuthConfig): AdminStorageConfig {
  if (!config.supabaseServiceRoleKey) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "SUPABASE_SERVICE_ROLE_KEY is required for vendor image uploads.",
      503,
      {
        bucket: VENDOR_IMAGE_BUCKET,
      },
    );
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  };
}

async function readStorageResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return text.length > 0 ? { message: text } : null;
    } catch {
      return null;
    }
  }
}

function getStorageErrorDetails(payload: unknown): {
  upstreamCode: string | null;
  upstreamMessage: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return {
      upstreamCode: null,
      upstreamMessage: null,
    };
  }

  const record = payload as Record<string, unknown>;
  const upstreamCode =
    typeof record.code === "string" && record.code.trim().length > 0
      ? record.code.trim()
      : typeof record.error === "string" && record.error.trim().length > 0
        ? record.error.trim()
        : null;
  const upstreamMessage =
    typeof record.message === "string" && record.message.trim().length > 0
      ? record.message.trim()
      : null;

  return {
    upstreamCode,
    upstreamMessage,
  };
}

export async function uploadVendorImageObject(
  {
    config,
    session,
    storageObjectPath,
    file,
    fileBytes,
    fetchImpl = fetch,
  }: {
    config: AdminAuthConfig;
    session: AdminSession;
    storageObjectPath: string;
    file: Pick<File, "name" | "type" | "size">;
    fileBytes: Uint8Array;
    fetchImpl?: typeof fetch;
  },
): Promise<void> {
  const storageConfig = requireAdminStorageConfig(config);

  logStructuredEvent("info", {
    event: "ADMIN_VENDOR_IMAGE_STORAGE_UPLOAD_STARTED",
    area: "storage",
    requestId: session.requestId,
    adminUserId: session.adminUser.id,
    userRole: session.adminUser.role,
    metadata: {
      bucket: VENDOR_IMAGE_BUCKET,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      hasBuffer: fileBytes.byteLength > 0,
      storageObjectPath,
    },
  });

  const response = await fetchImpl(
    new URL(
      `/storage/v1/object/${VENDOR_IMAGE_BUCKET}/${storageObjectPath}`,
      storageConfig.supabaseUrl,
    ),
    {
      method: "POST",
      headers: {
        apikey: storageConfig.supabaseServiceRoleKey,
        authorization: `Bearer ${storageConfig.supabaseServiceRoleKey}`,
        "content-type": file.type,
        "x-upsert": "true",
      },
      body: Buffer.from(fileBytes),
    },
  );

  if (!response.ok) {
    const payload = await readStorageResponse(response);
    const { upstreamCode, upstreamMessage } = getStorageErrorDetails(payload);

    logStructuredEvent("error", {
      event: "ADMIN_VENDOR_IMAGE_STORAGE_UPLOAD_FAILED",
      area: "storage",
      requestId: session.requestId,
      adminUserId: session.adminUser.id,
      userRole: session.adminUser.role,
      status: response.status,
      errorCode: upstreamCode ?? undefined,
      errorMessage: upstreamMessage ?? undefined,
      metadata: {
        bucket: VENDOR_IMAGE_BUCKET,
        storageObjectPath,
        payload,
      },
    });

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Storage upload failed${upstreamCode ? ` (${upstreamCode})` : ""}${upstreamMessage ? `: ${upstreamMessage}` : ` with HTTP ${response.status}.`}`,
      502,
      {
        bucket: VENDOR_IMAGE_BUCKET,
        storage_object_path: storageObjectPath,
        http_status: response.status,
        upstream_code: upstreamCode,
        upstream_message: upstreamMessage,
        upstream: payload,
      },
    );
  }
}

export async function deleteVendorImageObject(
  {
    config,
    storageObjectPath,
    fetchImpl = fetch,
  }: {
    config: AdminAuthConfig;
    session: AdminSession;
    storageObjectPath: string;
    fetchImpl?: typeof fetch;
  },
): Promise<void> {
  const storageConfig = requireAdminStorageConfig(config);
  const response = await fetchImpl(
    new URL(
      `/storage/v1/object/${VENDOR_IMAGE_BUCKET}/${storageObjectPath}`,
      storageConfig.supabaseUrl,
    ),
    {
      method: "DELETE",
      headers: {
        apikey: storageConfig.supabaseServiceRoleKey,
        authorization: `Bearer ${storageConfig.supabaseServiceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    const payload = await readStorageResponse(response);
    const { upstreamCode, upstreamMessage } = getStorageErrorDetails(payload);

    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Storage delete failed${upstreamCode ? ` (${upstreamCode})` : ""}${upstreamMessage ? `: ${upstreamMessage}` : ` with HTTP ${response.status}.`}`,
      502,
      {
        bucket: VENDOR_IMAGE_BUCKET,
        storage_object_path: storageObjectPath,
        http_status: response.status,
        upstream_code: upstreamCode,
        upstream_message: upstreamMessage,
        upstream: payload,
      },
    );
  }
}
