import { z } from "zod";
import {
  adminRiderSchema,
} from "../validation/schemas.ts";
import {
  getAdminAuthConfig,
  type AdminAuthConfig,
  type AdminSession,
} from "./auth.ts";
import { AdminServiceError } from "./errors.ts";
import { writeAuditLogSafely } from "./audit-log-service.ts";
import type {
  AdminRider,
  AdminRidersQuery,
  UpdateAdminRiderRequest,
} from "../../types/index.ts";

type AdminRiderServiceContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type ResolvedAdminRiderServiceContext = {
  session: AdminSession;
  config: AdminAuthConfig;
  fetchImpl: typeof fetch;
};

export type AdminRiderListResult = {
  riders: AdminRider[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

const riderSelectColumns = [
  "id",
  "display_name",
  "full_name",
  "phone",
  "whatsapp_phone",
  "photo_url",
  "vehicle_type",
  "plate_number",
  "operating_areas",
  "usual_available_hours",
  "verification_status",
  "visibility_status",
  "notes",
  "consent_accepted_at",
  "created_at",
  "updated_at",
].join(",");

const maxAdminRiderFetchLimit = 1000;

function requireServiceConfig(
  config: AdminAuthConfig | null | undefined,
): AdminAuthConfig {
  if (!config) {
    throw new AdminServiceError(
      "CONFIGURATION_ERROR",
      "Supabase environment variables are required for admin rider operations.",
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
      `Supabase admin rider operation failed with HTTP ${response.status}.`,
      502,
      {
        status: response.status,
        upstream_message: payload === null ? null : "Rider Data API request failed.",
      },
    );
  }

  return payload;
}

function parseRiderRows(payload: unknown): AdminRider[] {
  const parsed = z.array(adminRiderSchema).safeParse(payload);

  if (!parsed.success) {
    throw new AdminServiceError(
      "UPSTREAM_ERROR",
      "Supabase returned an unexpected rider payload.",
      502,
      { issues: parsed.error.issues },
    );
  }

  return parsed.data;
}

function parseRiderRow(payload: unknown): AdminRider {
  const rider = parseRiderRows(payload)[0];

  if (!rider) {
    throw new AdminServiceError("NOT_FOUND", "Rider was not found.", 404);
  }

  return rider;
}

function countByRiderId(rows: unknown): Map<string, number> {
  const parsed = z.array(z.object({ rider_id: z.string().uuid() }).passthrough()).safeParse(rows);
  const counts = new Map<string, number>();

  if (!parsed.success) {
    return counts;
  }

  for (const row of parsed.data) {
    counts.set(row.rider_id, (counts.get(row.rider_id) ?? 0) + 1);
  }

  return counts;
}

function createRiderIdInFilter(riderIds: string[]): string {
  return `in.(${riderIds.join(",")})`;
}

function matchesRiderSearch(rider: AdminRider, search: string | undefined): boolean {
  const normalizedSearch = search?.trim().toLowerCase() ?? "";

  if (!normalizedSearch) {
    return true;
  }

  const searchableValues = [
    rider.display_name,
    rider.full_name,
    rider.phone,
    rider.whatsapp_phone,
    rider.vehicle_type,
    rider.plate_number,
    rider.notes,
    ...rider.operating_areas,
  ];

  return searchableValues.some((value) => value?.toLowerCase().includes(normalizedSearch));
}

async function loadRiderCounts(
  riders: AdminRider[],
  context: ResolvedAdminRiderServiceContext,
): Promise<AdminRider[]> {
  if (riders.length === 0) {
    return riders;
  }

  const riderIds = riders.map((rider) => rider.id);
  const [contactIntentPayload, unavailableReportPayload] = await Promise.all([
    fetchJson(
      createRestUrl(context.config, "rider_contact_intents", {
        select: "rider_id",
        rider_id: createRiderIdInFilter(riderIds),
        limit: String(maxAdminRiderFetchLimit),
      }),
      {
        method: "GET",
        headers: createHeaders(context.session, context.config, ""),
      },
      context.fetchImpl,
    ),
    fetchJson(
      createRestUrl(context.config, "rider_unavailable_reports", {
        select: "rider_id",
        rider_id: createRiderIdInFilter(riderIds),
        limit: String(maxAdminRiderFetchLimit),
      }),
      {
        method: "GET",
        headers: createHeaders(context.session, context.config, ""),
      },
      context.fetchImpl,
    ),
  ]);
  const contactIntentCounts = countByRiderId(contactIntentPayload);
  const unavailableReportCounts = countByRiderId(unavailableReportPayload);

  return riders.map((rider) => ({
    ...rider,
    contact_intent_count: contactIntentCounts.get(rider.id) ?? 0,
    unavailable_report_count: unavailableReportCounts.get(rider.id) ?? 0,
  }));
}

function createRiderListUrl(config: AdminAuthConfig, query: AdminRidersQuery): URL {
  const filters: Record<string, string> = {
    select: riderSelectColumns,
    order: "created_at.desc",
    limit: String(maxAdminRiderFetchLimit),
  };

  if (query.verification_status) {
    filters.verification_status = `eq.${query.verification_status}`;
  }

  if (query.visibility_status) {
    filters.visibility_status = `eq.${query.visibility_status}`;
  }

  return createRestUrl(config, "riders", filters);
}

function createRiderDetailUrl(config: AdminAuthConfig, riderId: string): URL {
  return createRestUrl(config, "riders", {
    id: `eq.${riderId}`,
    select: riderSelectColumns,
    limit: "1",
  });
}

function getChangedFields(previous: AdminRider, next: AdminRider): string[] {
  const changedFields: string[] = [];
  const trackedFields: Array<keyof UpdateAdminRiderRequest> = [
    "display_name",
    "full_name",
    "phone",
    "whatsapp_phone",
    "vehicle_type",
    "plate_number",
    "operating_areas",
    "usual_available_hours",
    "verification_status",
    "visibility_status",
    "notes",
  ];

  for (const field of trackedFields) {
    if (JSON.stringify(previous[field]) !== JSON.stringify(next[field])) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

function createAuditMetadata(previous: AdminRider, next: AdminRider, changedFields: string[]) {
  return {
    rider_display_name: next.display_name,
    changed_fields: changedFields,
    previous_verification_status: previous.verification_status,
    next_verification_status: next.verification_status,
    previous_visibility_status: previous.visibility_status,
    next_visibility_status: next.visibility_status,
  };
}

function createResolvedContext(context: AdminRiderServiceContext): ResolvedAdminRiderServiceContext {
  return {
    session: context.session,
    config: requireServiceConfig(context.config ?? getAdminAuthConfig()),
    fetchImpl: context.fetchImpl ?? fetch,
  };
}

export async function listAdminRiders(
  query: AdminRidersQuery,
  context: AdminRiderServiceContext,
): Promise<AdminRiderListResult> {
  const resolvedContext = createResolvedContext(context);
  const payload = await fetchJson(
    createRiderListUrl(resolvedContext.config, query),
    {
      method: "GET",
      headers: createHeaders(resolvedContext.session, resolvedContext.config, ""),
    },
    resolvedContext.fetchImpl,
  );
  const riders = await loadRiderCounts(parseRiderRows(
    Array.isArray(payload)
      ? payload.map((row) => ({
          contact_intent_count: 0,
          unavailable_report_count: 0,
          ...row,
        }))
      : payload,
  ), resolvedContext);
  const filteredRiders = riders.filter((rider) => matchesRiderSearch(rider, query.search));
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  return {
    riders: filteredRiders.slice(offset, offset + limit),
    pagination: {
      limit,
      offset,
      count: filteredRiders.length,
    },
  };
}

export async function getAdminRider(
  riderId: string,
  context: AdminRiderServiceContext,
): Promise<AdminRider> {
  const resolvedContext = createResolvedContext(context);
  const payload = await fetchJson(
    createRiderDetailUrl(resolvedContext.config, riderId),
    {
      method: "GET",
      headers: createHeaders(resolvedContext.session, resolvedContext.config, ""),
    },
    resolvedContext.fetchImpl,
  );
  const [rider] = await loadRiderCounts(parseRiderRows(
    Array.isArray(payload)
      ? payload.map((row) => ({
          contact_intent_count: 0,
          unavailable_report_count: 0,
          ...row,
        }))
      : payload,
  ), resolvedContext);

  if (!rider) {
    throw new AdminServiceError("NOT_FOUND", "Rider was not found.", 404);
  }

  return rider;
}

export async function updateAdminRider(
  riderId: string,
  data: UpdateAdminRiderRequest,
  context: AdminRiderServiceContext,
): Promise<AdminRider> {
  const resolvedContext = createResolvedContext(context);
  const previousRider = await getAdminRider(riderId, resolvedContext);
  const payload = await fetchJson(
    createRestUrl(resolvedContext.config, "riders", {
      id: `eq.${riderId}`,
      select: riderSelectColumns,
    }),
    {
      method: "PATCH",
      headers: createHeaders(resolvedContext.session, resolvedContext.config),
      body: JSON.stringify(data),
    },
    resolvedContext.fetchImpl,
  );
  const updatedRider = parseRiderRow(
    Array.isArray(payload)
      ? payload.map((row) => ({
          contact_intent_count: 0,
          unavailable_report_count: 0,
          ...row,
        }))
      : payload,
  );
  const changedFields = getChangedFields(previousRider, updatedRider);
  const action = changedFields.some((field) =>
      field === "verification_status" || field === "visibility_status"
    )
    ? "UPDATE_RIDER_STATUS"
    : "UPDATE_RIDER";

  await writeAuditLogSafely(
    {
      action,
      entityType: "rider",
      entityId: updatedRider.id,
      metadata: createAuditMetadata(previousRider, updatedRider, changedFields),
    },
    resolvedContext,
  );

  const [riderWithCounts] = await loadRiderCounts([updatedRider], resolvedContext);

  return riderWithCounts ?? updatedRider;
}
