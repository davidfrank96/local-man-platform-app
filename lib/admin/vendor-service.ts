import { z } from "zod";
import {
  adminVendorSummarySchema,
  vendorCategorySchema,
  vendorFeaturedDishSchema,
  vendorHoursSchema,
  vendorImageSchema,
  vendorSchema,
  vendorSummarySchema,
} from "../validation/schemas.ts";
import { dayOfWeekSchema, uuidSchema } from "../validation/common.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import {
  buildVendorImageStoragePath,
  buildVendorImagePublicUrl,
  deleteVendorImageObject,
  uploadVendorImageObject,
} from "./storage.ts";
import { writeAuditLogSafely } from "./audit-log-service.ts";
import {
  normalizeVendorImageRows,
} from "../vendors/images.ts";
import type {
  AdminVendorsQuery,
  CreateVendorDishesRequest,
  CreateVendorRequest,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  VendorIdParams,
  VendorImageMetadataRequest,
} from "../../types/index.ts";

export type VendorRecord = z.infer<typeof vendorSchema>;
export type VendorSummaryRecord = z.infer<typeof adminVendorSummarySchema>;
export type VendorCategoryRecord = z.infer<typeof vendorCategorySchema>;
export type VendorHoursRecord = z.infer<typeof vendorHoursSchema>;
export type VendorImageRecord = z.infer<typeof vendorImageSchema>;
export type VendorFeaturedDishRecord = z.infer<typeof vendorFeaturedDishSchema>;
export type VendorDuplicateCandidateRecord = Pick<
  VendorRecord,
  "id" | "name" | "slug" | "address_text" | "area" | "latitude" | "longitude"
>;

export type DeleteVendorResult = {
  vendor_id: string;
  is_active: false;
};

export type ListVendorsResult = {
  vendors: VendorSummaryRecord[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

type AdminVendorServiceContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

function requireServiceConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for admin vendor operations.",
      503,
    );
  }

  return config;
}

function createRestUrl(
  config: AdminAuthConfig,
  table: string,
  filters: Record<string, string> = {},
): URL {
  const url = new URL(`/rest/v1/${table}`, config.supabaseUrl);

  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function createHeaders(
  session: AdminSession,
  config: AdminAuthConfig,
  prefer = "return=representation",
): HeadersInit {
  return {
    apikey: config.supabaseAnonKey,
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchJson(
  url: URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const response = await fetchImpl(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      `Supabase admin operation failed with HTTP ${response.status}.`,
      502,
      payload,
    );
  }

  return payload;
}

function parseSupabasePayload<T>(schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Supabase returned an unexpected response shape.",
      502,
      {
        issues: parsed.error.issues,
      },
    );
  }

  return parsed.data;
}

function parseReturnedVendor(payload: unknown): VendorRecord {
  const rows = parseSupabasePayload(z.array(vendorSchema), payload);
  const vendor = rows[0];

  if (!vendor) {
    throw new AdminServiceError(
      "NOT_FOUND",
      "Vendor was not found.",
      404,
    );
  }

  return vendor;
}

function parseReturnedVendors(payload: unknown): VendorSummaryRecord[] {
  return parseSupabasePayload(z.array(adminVendorSummarySchema), payload);
}

function toAdminVendorSummaryRecord(vendor: unknown): VendorSummaryRecord {
  return adminVendorSummarySchema.parse({
    ...vendorSummarySchema.parse(vendor),
    hours_count: 0,
    images_count: 0,
    featured_dishes_count: 0,
  });
}

function parseReturnedHours(payload: unknown): VendorHoursRecord[] {
  return parseSupabasePayload(z.array(vendorHoursSchema), payload);
}

function parseReturnedImages(payload: unknown): VendorImageRecord[] {
  return parseSupabasePayload(z.array(vendorImageSchema), payload);
}

function parseReturnedImage(payload: unknown): VendorImageRecord {
  const images = parseReturnedImages(payload);
  const image = images[0];

  if (!image) {
    throw new AdminServiceError("NOT_FOUND", "Vendor image was not found.", 404);
  }

  return image;
}

function parseReturnedDishes(payload: unknown): VendorFeaturedDishRecord[] {
  return parseSupabasePayload(z.array(vendorFeaturedDishSchema), payload);
}

function parseReturnedCategories(payload: unknown): VendorCategoryRecord[] {
  return parseSupabasePayload(z.array(vendorCategorySchema), payload);
}

function sanitizeSupabaseSearch(value: string): string {
  return value.replaceAll("*", "").replaceAll(",", " ").trim();
}

export async function listVendors(
  query: AdminVendorsQuery,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<ListVendorsResult> {
  const resolvedConfig = requireServiceConfig(config);
  const filters: Record<string, string> = {
    select: [
      "id",
      "name",
      "slug",
      "short_description",
      "phone_number",
      "area",
      "latitude",
      "longitude",
      "price_band",
      "average_rating",
      "review_count",
      "is_active",
      "is_open_override",
    ].join(","),
    order: "created_at.desc",
    limit: String(query.limit),
    offset: String(query.offset),
  };

  if (query.is_active !== undefined) {
    filters.is_active = `eq.${query.is_active}`;
  }

  if (query.price_band) {
    filters.price_band = `eq.${query.price_band}`;
  }

  if (query.area) {
    filters.area = `ilike.*${sanitizeSupabaseSearch(query.area)}*`;
  }

  if (query.search) {
    const search = sanitizeSupabaseSearch(query.search);
    filters.or = `(name.ilike.*${search}*,short_description.ilike.*${search}*,area.ilike.*${search}*)`;
  }

  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendors", filters),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );
  const vendorRows = parseSupabasePayload(z.array(vendorSummarySchema), payload);

  if (vendorRows.length === 0) {
    return {
      vendors: [],
      pagination: {
        limit: query.limit,
        offset: query.offset,
        count: 0,
      },
    };
  }

  const vendorIds = vendorRows.map((vendor) => vendor.id);
  const vendorIdFilter = `in.(${vendorIds.join(",")})`;

  const [hoursPayload, imagesPayload, dishesPayload] = await Promise.all([
    fetchJson(
      createRestUrl(resolvedConfig, "vendor_hours", {
        vendor_id: vendorIdFilter,
        select: "vendor_id,day_of_week",
      }),
      {
        method: "GET",
        headers: createHeaders(session, resolvedConfig, ""),
      },
      fetchImpl,
    ),
    fetchJson(
      createRestUrl(resolvedConfig, "vendor_images", {
        vendor_id: vendorIdFilter,
        select: "vendor_id",
      }),
      {
        method: "GET",
        headers: createHeaders(session, resolvedConfig, ""),
      },
      fetchImpl,
    ),
    fetchJson(
      createRestUrl(resolvedConfig, "vendor_featured_dishes", {
        vendor_id: vendorIdFilter,
        select: "vendor_id",
      }),
      {
        method: "GET",
        headers: createHeaders(session, resolvedConfig, ""),
      },
      fetchImpl,
    ),
  ]);

  const vendorHoursRows = parseSupabasePayload(
    z.array(
      z.object({
        vendor_id: uuidSchema,
        day_of_week: dayOfWeekSchema,
      }),
    ),
    hoursPayload,
  );
  const vendorImageRows = parseSupabasePayload(
    z.array(
      z.object({
        vendor_id: uuidSchema,
      }),
    ),
    imagesPayload,
  );
  const vendorDishRows = parseSupabasePayload(
    z.array(
      z.object({
        vendor_id: uuidSchema,
      }),
    ),
    dishesPayload,
  );

  const hoursCountByVendor = new Map<string, number>();
  for (const row of vendorHoursRows) {
    hoursCountByVendor.set(row.vendor_id, (hoursCountByVendor.get(row.vendor_id) ?? 0) + 1);
  }

  const imagesCountByVendor = new Map<string, number>();
  for (const row of vendorImageRows) {
    imagesCountByVendor.set(row.vendor_id, (imagesCountByVendor.get(row.vendor_id) ?? 0) + 1);
  }

  const dishesCountByVendor = new Map<string, number>();
  for (const row of vendorDishRows) {
    dishesCountByVendor.set(row.vendor_id, (dishesCountByVendor.get(row.vendor_id) ?? 0) + 1);
  }

  const vendors = parseReturnedVendors(
    vendorRows.map((vendor) => ({
      ...vendor,
      hours_count: hoursCountByVendor.get(vendor.id) ?? 0,
      images_count: imagesCountByVendor.get(vendor.id) ?? 0,
      featured_dishes_count: dishesCountByVendor.get(vendor.id) ?? 0,
    })),
  );

  return {
    vendors,
    pagination: {
      limit: query.limit,
      offset: query.offset,
      count: vendors.length,
    },
  };
}

export async function listVendorCategories(
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorCategoryRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_categories", {
      select: "id,name,slug,created_at",
      order: "name.asc",
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );

  return parseReturnedCategories(payload);
}

export async function listExistingVendorSlugs(
  slugs: string[],
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<string[]> {
  if (slugs.length === 0) {
    return [];
  }

  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendors", {
      select: "slug",
      slug: `in.(${slugs.join(",")})`,
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );
  const rows = parseSupabasePayload(
    z.array(
      z.object({
        slug: z.string(),
      }),
    ),
    payload,
  );

  return rows.map((row) => row.slug);
}

export async function listPotentialDuplicateVendors(
  slugs: string[],
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorDuplicateCandidateRecord[]> {
  if (slugs.length === 0) {
    return [];
  }

  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendors", {
      select: "id,name,slug,address_text,area,latitude,longitude",
      slug: `in.(${slugs.join(",")})`,
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );
  const rows = parseSupabasePayload(
    z.array(
      vendorSchema.pick({
        id: true,
        name: true,
        slug: true,
        address_text: true,
        area: true,
        latitude: true,
        longitude: true,
      }),
    ),
    payload,
  );

  return rows;
}

export async function attachVendorCategory(
  params: VendorIdParams,
  categoryId: string,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<void> {
  const resolvedConfig = requireServiceConfig(config);
  const useServiceRole = Boolean(resolvedConfig.supabaseServiceRoleKey);
  const headers: HeadersInit = {
    apikey: useServiceRole
      ? resolvedConfig.supabaseServiceRoleKey ?? resolvedConfig.supabaseAnonKey
      : resolvedConfig.supabaseAnonKey,
    authorization: `Bearer ${
      useServiceRole
        ? resolvedConfig.supabaseServiceRoleKey ?? session.accessToken
        : session.accessToken
    }`,
    "content-type": "application/json",
    prefer: "return=minimal",
  };

  const response = await fetchImpl(
    createRestUrl(resolvedConfig, "vendor_category_map"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        vendor_id: params.id,
        category_id: categoryId,
      }),
    },
  );

  if (!response.ok) {
    const payload = await readJson(response);
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unable to save the vendor category.",
      502,
      payload,
    );
  }
}

export async function createVendor(
  data: CreateVendorRequest,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorSummaryRecord> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendors", { select: "*" }),
    {
      method: "POST",
      headers: createHeaders(session, resolvedConfig),
      body: JSON.stringify(data),
    },
    fetchImpl,
  );
  const vendor = parseReturnedVendor(payload);

  void writeAuditLogSafely(
    {
      entityId: vendor.id,
      entityType: "vendor",
      action: "CREATE_VENDOR",
      metadata: {
        target_name: vendor.name,
        target_slug: vendor.slug,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return toAdminVendorSummaryRecord(vendor);
}

export async function updateVendor(
  params: VendorIdParams,
  data: UpdateVendorRequest,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorSummaryRecord> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendors", {
      id: `eq.${params.id}`,
      select: "*",
    }),
    {
      method: "PATCH",
      headers: createHeaders(session, resolvedConfig),
      body: JSON.stringify(data),
    },
    fetchImpl,
  );
  const vendor = parseReturnedVendor(payload);
  const changedFields = Object.keys(data);
  const action = changedFields.some((field) =>
    field === "is_active" || field === "is_open_override"
  )
    ? "UPDATE_VENDOR_STATUS"
    : "UPDATE_VENDOR";

  void writeAuditLogSafely(
    {
      entityId: vendor.id,
      entityType: "vendor",
      action,
      metadata: {
        changed_fields: changedFields,
        target_name: vendor.name,
        target_slug: vendor.slug,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return toAdminVendorSummaryRecord(vendor);
}

export async function softDeleteVendor(
  params: VendorIdParams,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<DeleteVendorResult> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendors", {
      id: `eq.${params.id}`,
      select: "*",
    }),
    {
      method: "PATCH",
      headers: createHeaders(session, resolvedConfig),
      body: JSON.stringify({
        is_active: false,
      }),
    },
    fetchImpl,
  );
  const vendor = parseReturnedVendor(payload);

  void writeAuditLogSafely(
    {
      entityId: vendor.id,
      entityType: "vendor",
      action: "DELETE_VENDOR",
      metadata: {
        target_name: vendor.name,
        target_slug: vendor.slug,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return {
    vendor_id: vendor.id,
    is_active: false,
  };
}

export async function hardDeleteVendor(
  params: VendorIdParams,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<void> {
  const resolvedConfig = requireServiceConfig(config);
  const useServiceRole = Boolean(resolvedConfig.supabaseServiceRoleKey);
  const headers: HeadersInit = {
    apikey: useServiceRole
      ? resolvedConfig.supabaseServiceRoleKey ?? resolvedConfig.supabaseAnonKey
      : resolvedConfig.supabaseAnonKey,
    authorization: `Bearer ${
      useServiceRole
        ? resolvedConfig.supabaseServiceRoleKey ?? session.accessToken
        : session.accessToken
    }`,
    prefer: "return=minimal",
  };

  const response = await fetchImpl(
    createRestUrl(resolvedConfig, "vendors", {
      id: `eq.${params.id}`,
    }),
    {
      method: "DELETE",
      headers,
    },
  );

  if (!response.ok) {
    const payload = await readJson(response);
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Unable to rollback the vendor after upload failure.",
      502,
      payload,
    );
  }
}

export async function replaceVendorHours(
  params: VendorIdParams,
  data: ReplaceVendorHoursRequest,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorHoursRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_hours", {
      on_conflict: "vendor_id,day_of_week",
      select: "*",
    }),
    {
      method: "POST",
      headers: createHeaders(
        session,
        resolvedConfig,
        "resolution=merge-duplicates,return=representation",
      ),
      body: JSON.stringify(
        data.hours.map((hours) => ({
          vendor_id: params.id,
          day_of_week: hours.day_of_week,
          open_time: hours.open_time,
          close_time: hours.close_time,
          is_closed: hours.is_closed,
        })),
      ),
    },
    fetchImpl,
  );
  const hours = parseReturnedHours(payload);

  void writeAuditLogSafely(
    {
      entityId: params.id,
      entityType: "vendor",
      action: "UPDATE_VENDOR_HOURS",
      metadata: {
        day_count: hours.length,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return hours;
}

export async function listVendorHours(
  params: VendorIdParams,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorHoursRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_hours", {
      vendor_id: `eq.${params.id}`,
      order: "day_of_week.asc",
      select: "*",
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );

  return parseReturnedHours(payload).toSorted(
    (left, right) => left.day_of_week - right.day_of_week,
  );
}

export async function createVendorImages(
  params: VendorIdParams,
  data: VendorImageMetadataRequest,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorImageRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_images", { select: "*" }),
    {
      method: "POST",
      headers: createHeaders(session, resolvedConfig),
      body: JSON.stringify(
        data.images.map((image) => ({
          vendor_id: params.id,
          image_url: image.image_url,
          storage_object_path: image.storage_object_path ?? null,
          sort_order: image.sort_order,
        })),
      ),
    },
    fetchImpl,
  );
  const images = parseReturnedImages(payload);

  void writeAuditLogSafely(
    {
      entityId: params.id,
      entityType: "vendor",
      action: "CREATE_VENDOR_IMAGES",
      metadata: {
        count: images.length,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return images;
}

export async function listVendorImages(
  params: VendorIdParams,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorImageRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_images", {
      vendor_id: `eq.${params.id}`,
      order: "sort_order.asc",
      select: "*",
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );

  return parseReturnedImages(normalizeVendorImageRows(resolvedConfig.supabaseUrl, payload));
}

export async function uploadVendorImage(
  params: VendorIdParams,
  data: {
    file: File;
    fileBytes: Uint8Array;
    sort_order: number;
  },
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorImageRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const imageId = crypto.randomUUID();
  const storageObjectPath = buildVendorImageStoragePath(
    params.id,
    imageId,
    data.file,
  );
  const imageUrl = buildVendorImagePublicUrl(resolvedConfig, storageObjectPath);

  console.info("[admin][vendor-image] uploading storage object", {
    vendorId: params.id,
    imageId,
    storageObjectPath,
    fileName: data.file.name,
    sortOrder: data.sort_order,
  });

  await uploadVendorImageObject({
    config: resolvedConfig,
    session,
    storageObjectPath,
    file: data.file,
    fileBytes: data.fileBytes,
    fetchImpl,
  });

  console.info("[admin][vendor-image] storage upload complete", {
    vendorId: params.id,
    storageObjectPath,
  });

  try {
    console.info("[admin][vendor-image] inserting vendor_images row", {
      vendorId: params.id,
      storageObjectPath,
      imageUrl,
    });
    const payload = await fetchJson(
      createRestUrl(resolvedConfig, "vendor_images", { select: "*" }),
      {
        method: "POST",
        headers: createHeaders(session, resolvedConfig),
        body: JSON.stringify([
          {
            vendor_id: params.id,
            image_url: imageUrl,
            storage_object_path: storageObjectPath,
            sort_order: data.sort_order,
          },
        ]),
      },
      fetchImpl,
    );
    const images = parseReturnedImages(
      normalizeVendorImageRows(resolvedConfig.supabaseUrl, payload),
    );

    console.info("[admin][vendor-image] vendor_images insert complete", {
      vendorId: params.id,
      imageCount: images.length,
      imageId: images[0]?.id ?? null,
      imageUrl: images[0]?.image_url ?? null,
    });

    void writeAuditLogSafely(
      {
        entityId: params.id,
        entityType: "vendor",
        action: "UPLOAD_VENDOR_IMAGE",
        metadata: {
          image_id: images[0]?.id ?? null,
          storage_object_path: storageObjectPath,
        },
      },
      { session, config: resolvedConfig, fetchImpl },
    );

    return images;
  } catch (error) {
    console.error("[admin][vendor-image] insert failed, removing uploaded object", {
      vendorId: params.id,
      storageObjectPath,
      error:
        error instanceof Error
          ? error.message
          : "Unknown vendor image insert failure.",
    });
    await deleteVendorImageObject({
      config: resolvedConfig,
      session,
      storageObjectPath,
      fetchImpl,
    }).catch(() => undefined);
    throw error;
  }
}

export async function deleteVendorImage(
  params: VendorIdParams & { imageId: string },
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorImageRecord> {
  const resolvedConfig = requireServiceConfig(config);
  const imagePayload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_images", {
      id: `eq.${params.imageId}`,
      vendor_id: `eq.${params.id}`,
      select: "*",
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );
  const image = parseReturnedImage(
    normalizeVendorImageRows(resolvedConfig.supabaseUrl, imagePayload),
  );

  if (image.storage_object_path) {
    await deleteVendorImageObject({
      config: resolvedConfig,
      session,
      storageObjectPath: image.storage_object_path,
      fetchImpl,
    });
  }

  await fetchJson(
    createRestUrl(resolvedConfig, "vendor_images", {
      id: `eq.${params.imageId}`,
      vendor_id: `eq.${params.id}`,
    }),
    {
      method: "DELETE",
      headers: createHeaders(session, resolvedConfig, "return=minimal"),
    },
    fetchImpl,
  );

  void writeAuditLogSafely(
    {
      entityId: params.id,
      entityType: "vendor",
      action: "DELETE_VENDOR_IMAGE",
      metadata: {
        image_id: image.id,
        storage_object_path: image.storage_object_path,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return image;
}

export async function createVendorDishes(
  params: VendorIdParams,
  data: CreateVendorDishesRequest,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorFeaturedDishRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_featured_dishes", { select: "*" }),
    {
      method: "POST",
      headers: createHeaders(session, resolvedConfig),
      body: JSON.stringify(
        data.dishes.map((dish) => ({
          vendor_id: params.id,
          dish_name: dish.dish_name,
          description: dish.description,
          image_url: dish.image_url,
          is_featured: dish.is_featured,
        })),
      ),
    },
    fetchImpl,
  );
  const dishes = parseReturnedDishes(payload);

  void writeAuditLogSafely(
    {
      entityId: params.id,
      entityType: "vendor",
      action: "CREATE_VENDOR_DISHES",
      metadata: {
        count: dishes.length,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return dishes;
}

export async function listVendorDishes(
  params: VendorIdParams,
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorFeaturedDishRecord[]> {
  const resolvedConfig = requireServiceConfig(config);
  const payload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_featured_dishes", {
      vendor_id: `eq.${params.id}`,
      order: "created_at.asc",
      select: "*",
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );

  return parseReturnedDishes(payload);
}

export async function deleteVendorDish(
  params: VendorIdParams & { dishId: string },
  {
    session,
    config = getAdminAuthConfig(),
    fetchImpl = fetch,
  }: AdminVendorServiceContext,
): Promise<VendorFeaturedDishRecord> {
  const resolvedConfig = requireServiceConfig(config);
  const dishPayload = await fetchJson(
    createRestUrl(resolvedConfig, "vendor_featured_dishes", {
      id: `eq.${params.dishId}`,
      vendor_id: `eq.${params.id}`,
      select: "*",
    }),
    {
      method: "GET",
      headers: createHeaders(session, resolvedConfig, ""),
    },
    fetchImpl,
  );
  const dishes = parseReturnedDishes(dishPayload);
  const dish = dishes[0];

  if (!dish) {
    throw new AdminServiceError("NOT_FOUND", "Vendor dish was not found.", 404);
  }

  await fetchJson(
    createRestUrl(resolvedConfig, "vendor_featured_dishes", {
      id: `eq.${params.dishId}`,
      vendor_id: `eq.${params.id}`,
    }),
    {
      method: "DELETE",
      headers: createHeaders(session, resolvedConfig, "return=minimal"),
    },
    fetchImpl,
  );

  void writeAuditLogSafely(
    {
      entityId: params.id,
      entityType: "vendor",
      action: "DELETE_VENDOR_DISH",
      metadata: {
        dish_id: dish.id,
        dish_name: dish.dish_name,
      },
    },
    { session, config: resolvedConfig, fetchImpl },
  );

  return dish;
}
