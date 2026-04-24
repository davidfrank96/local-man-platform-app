import { z } from "zod";
import {
  vendorFeaturedDishSchema,
  vendorHoursSchema,
  vendorImageSchema,
  vendorSchema,
  vendorSummarySchema,
} from "../validation/schemas.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import {
  buildVendorImagePublicUrl,
  buildVendorImageStoragePath,
  deleteVendorImageObject,
  uploadVendorImageObject,
} from "./storage.ts";
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
export type VendorSummaryRecord = z.infer<typeof vendorSummarySchema>;
export type VendorHoursRecord = z.infer<typeof vendorHoursSchema>;
export type VendorImageRecord = z.infer<typeof vendorImageSchema>;
export type VendorFeaturedDishRecord = z.infer<typeof vendorFeaturedDishSchema>;

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
  return parseSupabasePayload(z.array(vendorSummarySchema), payload);
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

function sanitizeSupabaseSearch(value: string): string {
  return value.replaceAll("*", "").replaceAll(",", " ").trim();
}

async function writeAuditLog(
  {
    session,
    config,
    fetchImpl,
  }: Required<Pick<AdminVendorServiceContext, "session" | "fetchImpl">> & {
    config: AdminAuthConfig;
  },
  input: {
    entityId: string;
    action: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  await fetchJson(
    createRestUrl(config, "audit_logs"),
    {
      method: "POST",
      headers: createHeaders(session, config, "return=minimal"),
      body: JSON.stringify({
        admin_user_id: session.adminUser.id,
        entity_type: "vendor",
        entity_id: input.entityId,
        action: input.action,
        metadata: input.metadata,
      }),
    },
    fetchImpl,
  );
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
  const vendors = parseReturnedVendors(payload);

  return {
    vendors,
    pagination: {
      limit: query.limit,
      offset: query.offset,
      count: vendors.length,
    },
  };
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

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: vendor.id,
      action: "vendor.created",
      metadata: {
        slug: vendor.slug,
      },
    },
  );

  return vendorSummarySchema.parse(vendor);
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

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: vendor.id,
      action: "vendor.updated",
      metadata: {
        changed_fields: Object.keys(data),
        slug: vendor.slug,
      },
    },
  );

  return vendorSummarySchema.parse(vendor);
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

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: vendor.id,
      action: "vendor.soft_deleted",
      metadata: {
        slug: vendor.slug,
      },
    },
  );

  return {
    vendor_id: vendor.id,
    is_active: false,
  };
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

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: params.id,
      action: "vendor.hours_replaced",
      metadata: {
        days: hours.length,
      },
    },
  );

  return hours;
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
          sort_order: image.sort_order,
        })),
      ),
    },
    fetchImpl,
  );
  const images = parseReturnedImages(payload);

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: params.id,
      action: "vendor.images_created",
      metadata: {
        count: images.length,
      },
    },
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

  return parseReturnedImages(payload);
}

export async function uploadVendorImage(
  params: VendorIdParams,
  data: {
    file: File;
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

  await uploadVendorImageObject({
    config: resolvedConfig,
    session,
    storageObjectPath,
    file: data.file,
    fetchImpl,
  });

  try {
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
    const images = parseReturnedImages(payload);

    await writeAuditLog(
      { session, config: resolvedConfig, fetchImpl },
      {
        entityId: params.id,
        action: "vendor.image_uploaded",
        metadata: {
          image_id: images[0]?.id ?? null,
          storage_object_path: storageObjectPath,
        },
      },
    );

    return images;
  } catch (error) {
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
  const image = parseReturnedImage(imagePayload);

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

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: params.id,
      action: "vendor.image_deleted",
      metadata: {
        image_id: image.id,
        storage_object_path: image.storage_object_path,
      },
    },
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

  await writeAuditLog(
    { session, config: resolvedConfig, fetchImpl },
    {
      entityId: params.id,
      action: "vendor.dishes_created",
      metadata: {
        count: dishes.length,
      },
    },
  );

  return dishes;
}
