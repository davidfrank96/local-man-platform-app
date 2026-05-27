import { createHash, createHmac } from "node:crypto";
import {
  publicRiderSuggestionSchema,
  riderContactHandoffResponseDataSchema,
  riderUnavailableReportResponseDataSchema,
} from "../validation/index.ts";
import {
  getSupabaseServiceRoleConfig,
} from "../vendors/supabase.ts";
import { logStructuredEvent } from "../observability.ts";
import {
  formatNigerianPhoneForDisplay,
  normalizeNigerianPhoneNumber,
} from "../phone.ts";
import {
  getRiderPublicFirstName,
  maskRiderPlateNumber,
} from "../riders/public-identity.ts";
import {
  isRiderAvailableNow,
  type RiderAvailabilityWindow,
} from "../riders/availability.ts";
import type {
  PublicRiderSuggestion,
  RiderContactHandoffRequest,
  RiderContactHandoffResponseData,
  RiderPaymentNoteType,
  RiderSuggestionsResponseData,
  RiderUnavailableReportRequest,
  RiderUnavailableReportResponseData,
} from "../../types/index.ts";

type RiderConnectConfig = {
  url: string;
  serviceRoleKey: string;
};

type VendorRiderTarget = {
  id: string;
  name: string;
  slug: string;
  phone_number: string | null;
  address_text: string | null;
  city: string | null;
  area: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
};

type PublicRiderSuggestionRow = {
  id: string;
  display_name: string;
  photo_url: string | null;
  vehicle_type: string | null;
  plate_number?: string | null;
  operating_areas: string[] | null;
  usual_available_hours: Record<string, unknown> | null;
} & RiderAvailabilityWindow;

type RiderContactRow = PublicRiderSuggestionRow & {
  whatsapp_phone: string;
};

type InsertedContactIntentRow = {
  id: string;
};

type InsertedUnavailableReportRow = {
  id: string;
};

export class RiderConnectServiceError extends Error {
  readonly code: "CONFIGURATION_ERROR" | "NOT_FOUND" | "UPSTREAM_ERROR";
  readonly status: number;

  constructor(
    code: "CONFIGURATION_ERROR" | "NOT_FOUND" | "UPSTREAM_ERROR",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "RiderConnectServiceError";
    this.code = code;
    this.status = status;
  }
}

const riderPublicSelect = [
  "id",
  "display_name",
  "photo_url",
  "vehicle_type",
  "operating_areas",
  "usual_available_hours",
  "weekday_available_from",
  "weekday_available_until",
  "weekend_available_from",
  "weekend_available_until",
].join(",");

const vendorRiderSelect = [
  "id",
  "name",
  "slug",
  "phone_number",
  "address_text",
  "city",
  "area",
  "state",
  "latitude",
  "longitude",
].join(",");

const riderContactSelect = `${riderPublicSelect},plate_number,whatsapp_phone`;
const riderSuggestionFetchLimit = 100;

let hasLoggedHashSecretFallback = false;

function getRiderConnectConfig(): RiderConnectConfig {
  const config = getSupabaseServiceRoleConfig();

  if (!config) {
    throw new RiderConnectServiceError(
      "CONFIGURATION_ERROR",
      "Supabase service-role environment variables are required for Rider Connect.",
      503,
    );
  }

  return config;
}

function createServiceRoleHeaders(
  config: RiderConnectConfig,
  prefer = "",
): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
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

async function fetchServiceJson<T>(
  url: URL,
  config: RiderConnectConfig,
  errorLabel: string,
): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: createServiceRoleHeaders(config),
    cache: "no-store",
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      `${errorLabel}: ${response.status}`,
      502,
    );
  }

  return payload as T;
}

function parseContentRangeTotal(contentRange: string | null): number | null {
  if (!contentRange) {
    return null;
  }

  const totalSegment = contentRange.split("/").at(-1)?.trim();

  if (!totalSegment || totalSegment === "*") {
    return null;
  }

  const total = Number.parseInt(totalSegment, 10);

  return Number.isFinite(total) && total >= 0 ? total : null;
}

function createRiderFetchOffset(totalVisibleRiders: number, now = new Date()): number {
  const maxOffset = Math.max(0, totalVisibleRiders - riderSuggestionFetchLimit);

  if (maxOffset === 0) {
    return 0;
  }

  const periodKey = now.toISOString().slice(0, 13);
  const hash = createHash("sha256")
    .update(`localman-rider-fetch-window:${periodKey}`)
    .digest("hex");
  const hashNumber = Number.parseInt(hash.slice(0, 8), 16);

  return hashNumber % (maxOffset + 1);
}

async function fetchVisibleVerifiedRiderCount(
  config: RiderConnectConfig,
): Promise<number | null> {
  const url = new URL("/rest/v1/riders", config.url);
  url.searchParams.set("select", "id");
  url.searchParams.set("verification_status", "eq.verified");
  url.searchParams.set("visibility_status", "eq.visible");
  url.searchParams.set("limit", "1");

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: createServiceRoleHeaders(config, "count=exact"),
      cache: "no-store",
    });
    await readJson(response);
  } catch (error) {
    logStructuredEvent("warn", {
      type: "RIDER_SUGGESTION_COUNT_UNAVAILABLE",
      message: "Rider suggestion count lookup failed; using the default fetch window.",
      error,
    });
    return null;
  }

  if (!response.ok) {
    logStructuredEvent("warn", {
      type: "RIDER_SUGGESTION_COUNT_UNAVAILABLE",
      message: "Rider suggestion count lookup was rejected; using the default fetch window.",
      status: response.status,
    });
    return null;
  }

  return parseContentRangeTotal(response.headers.get("content-range"));
}

async function fetchVendorTarget(
  slug: string,
  config: RiderConnectConfig,
): Promise<VendorRiderTarget | null> {
  const url = new URL("/rest/v1/vendors", config.url);
  url.searchParams.set("select", vendorRiderSelect);
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("limit", "1");

  const rows = await fetchServiceJson<VendorRiderTarget[]>(
    url,
    config,
    "Vendor lookup failed",
  );

  return rows[0] ?? null;
}

function getUsualAvailabilityLabel(value: Record<string, unknown> | null): string | null {
  const label = value?.label;

  return typeof label === "string" && label.trim().length > 0
    ? label.trim().slice(0, 120)
    : null;
}

function toPublicRiderSuggestion(row: PublicRiderSuggestionRow): PublicRiderSuggestion {
  return publicRiderSuggestionSchema.parse({
    rider_id: row.id,
    display_name: getRiderPublicFirstName(row.display_name),
    photo_url: row.photo_url,
    vehicle_type: row.vehicle_type,
    operating_areas: row.operating_areas ?? [],
    usual_availability_label: getUsualAvailabilityLabel(row.usual_available_hours),
  });
}

function toPublicRiderHandoff(row: RiderContactRow): PublicRiderSuggestion {
  return publicRiderSuggestionSchema.parse({
    rider_id: row.id,
    display_name: getRiderPublicFirstName(row.display_name),
    photo_url: row.photo_url,
    vehicle_type: row.vehicle_type,
    operating_areas: row.operating_areas ?? [],
    usual_availability_label: getUsualAvailabilityLabel(row.usual_available_hours),
    masked_plate_number: maskRiderPlateNumber(row.plate_number),
  });
}

function createRiderRotationScore(riderId: string, now: Date): string {
  const periodKey = now.toISOString().slice(0, 13);

  return createHash("sha256")
    .update(`localman-rider-shortlist:${periodKey}:${riderId}`)
    .digest("hex");
}

function createAvailableRiderShortlist(
  rows: PublicRiderSuggestionRow[],
  now = new Date(),
): PublicRiderSuggestion[] {
  return rows
    .filter((row) => isRiderAvailableNow(row, now))
    .sort((left, right) =>
      createRiderRotationScore(left.id, now).localeCompare(
        createRiderRotationScore(right.id, now),
      )
    )
    .slice(0, 3)
    .map(toPublicRiderSuggestion);
}

async function fetchVisibleVerifiedRiders(
  config: RiderConnectConfig,
): Promise<PublicRiderSuggestionRow[]> {
  const totalVisibleRiders = await fetchVisibleVerifiedRiderCount(config);
  const offset = totalVisibleRiders === null
    ? 0
    : createRiderFetchOffset(totalVisibleRiders);
  const url = new URL("/rest/v1/riders", config.url);
  url.searchParams.set("select", riderPublicSelect);
  url.searchParams.set("verification_status", "eq.verified");
  url.searchParams.set("visibility_status", "eq.visible");
  url.searchParams.set("order", "created_at.asc");
  url.searchParams.set("limit", String(riderSuggestionFetchLimit));

  if (
    totalVisibleRiders !== null &&
    totalVisibleRiders > riderSuggestionFetchLimit
  ) {
    url.searchParams.set("offset", String(offset));
  }

  const rows = await fetchServiceJson<PublicRiderSuggestionRow[]>(
    url,
    config,
    "Rider suggestion lookup failed",
  );

  return rows;
}

async function fetchSelectedVisibleRider(
  riderId: string,
  config: RiderConnectConfig,
): Promise<RiderContactRow | null> {
  const url = new URL("/rest/v1/riders", config.url);
  url.searchParams.set("select", riderContactSelect);
  url.searchParams.set("id", `eq.${riderId}`);
  url.searchParams.set("verification_status", "eq.verified");
  url.searchParams.set("visibility_status", "eq.visible");
  url.searchParams.set("limit", "1");

  const rows = await fetchServiceJson<RiderContactRow[]>(
    url,
    config,
    "Selected rider lookup failed",
  );

  return rows[0] ?? null;
}

async function fetchReportableVisibleRider(
  riderId: string,
  config: RiderConnectConfig,
): Promise<PublicRiderSuggestionRow | null> {
  const url = new URL("/rest/v1/riders", config.url);
  url.searchParams.set("select", riderPublicSelect);
  url.searchParams.set("id", `eq.${riderId}`);
  url.searchParams.set("verification_status", "eq.verified");
  url.searchParams.set("visibility_status", "eq.visible");
  url.searchParams.set("limit", "1");

  const rows = await fetchServiceJson<PublicRiderSuggestionRow[]>(
    url,
    config,
    "Reportable rider lookup failed",
  );

  return rows[0] ?? null;
}

function getHashSecret(config: RiderConnectConfig): string {
  const configuredSecret = process.env.RIDER_CONNECT_HASH_SECRET?.trim();

  if (configuredSecret && configuredSecret.length > 0) {
    return configuredSecret;
  }

  if (!hasLoggedHashSecretFallback) {
    hasLoggedHashSecretFallback = true;
    logStructuredEvent("warn", {
      type: "RIDER_CONNECT_HASH_SECRET_FALLBACK",
      message:
        "RIDER_CONNECT_HASH_SECRET is not set; Rider Connect phone hashes are using the service-role fallback.",
    });
  }

  return config.serviceRoleKey;
}

function hashPhoneForStorage(
  phone: string,
  config: RiderConnectConfig,
  purpose: "contact" | "unavailable_report",
): string {
  const normalizedPhone = normalizeNigerianPhoneNumber(phone);

  if (!normalizedPhone) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      "Rider Connect phone normalization failed.",
      502,
    );
  }

  return createHmac("sha256", getHashSecret(config))
    .update(`localman-rider-connect:${purpose}:${normalizedPhone}`)
    .digest("hex");
}

function createVendorAddress(vendor: VendorRiderTarget): string {
  return [
    vendor.address_text,
    vendor.area,
    vendor.city,
    vendor.state,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ") || "Address not listed";
}

function createMapLink(latitude: number, longitude: number): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${latitude},${longitude}`);

  return url.toString();
}

function formatPaymentNote(type: RiderPaymentNoteType): string {
  switch (type) {
    case "already_paid_vendor":
      return "I have already paid the vendor.";
    case "coordinate_directly":
      return "I will coordinate payment directly with the rider/vendor.";
    case "pay_vendor_on_pickup":
      return "I will coordinate vendor payment directly during pickup.";
    case "cash_on_delivery":
      return "I will coordinate cash payment directly with the rider/vendor.";
  }
}

function formatPhoneForMessage(phone: string | null | undefined, fallback: string): string {
  return formatNigerianPhoneForDisplay(phone) ?? phone ?? fallback;
}

function createWhatsAppPhonePath(phone: string): string {
  const normalizedPhone = normalizeNigerianPhoneNumber(phone);

  if (!normalizedPhone) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      "Selected rider WhatsApp number is not valid.",
      502,
    );
  }

  return normalizedPhone;
}

function buildWhatsAppMessage(
  vendor: VendorRiderTarget,
  rider: PublicRiderSuggestion,
  request: RiderContactHandoffRequest,
): string {
  const deliveryLocation =
    request.deliveryAddress ?? request.deliveryArea ?? "Delivery location not provided";
  const deliveryMap =
    request.deliveryLocationMode === "current_location"
      ? "Customer selected current location mode. Please ask them to share their exact pin directly."
      : "Not provided";
  const orderNote = request.orderNote ?? "Please confirm the order directly.";

  return [
    `Hello ${rider.display_name}, I found you on Localman.`,
    "",
    "I need help picking up food from:",
    "",
    "Vendor:",
    vendor.name,
    "Vendor phone:",
    formatPhoneForMessage(vendor.phone_number, "Vendor phone not listed"),
    "Pickup address:",
    createVendorAddress(vendor),
    "Pickup map:",
    createMapLink(vendor.latitude, vendor.longitude),
    "",
    "Delivery to:",
    deliveryLocation,
    "Delivery map:",
    deliveryMap,
    "",
    "My name:",
    request.customerName,
    "My phone:",
    formatPhoneForMessage(request.customerPhone, "Customer phone not provided"),
    "",
    "Order note:",
    orderNote,
    "",
    "Payment note:",
    formatPaymentNote(request.paymentNoteType),
    "",
    "Please call me and the vendor directly to confirm food availability, price, delivery fee, payment, and pickup time.",
    "",
    "Localman only connected us. Payment and delivery terms are handled directly between the customer, vendor, and rider.",
  ].join("\n");
}

function createWhatsAppUrl(
  riderWhatsappPhone: string,
  message: string,
): string {
  const url = new URL(`https://wa.me/${createWhatsAppPhonePath(riderWhatsappPhone)}`);
  url.searchParams.set("text", message);

  return url.toString();
}

async function insertContactIntent(
  vendor: VendorRiderTarget,
  rider: PublicRiderSuggestion,
  request: RiderContactHandoffRequest,
  config: RiderConnectConfig,
): Promise<string> {
  const acceptedAt = new Date().toISOString();
  const url = new URL("/rest/v1/rider_contact_intents", config.url);
  url.searchParams.set("select", "id");

  const response = await fetch(url, {
    method: "POST",
    headers: createServiceRoleHeaders(config, "return=representation"),
    body: JSON.stringify({
      vendor_id: vendor.id,
      rider_id: rider.rider_id,
      customer_phone_hash: hashPhoneForStorage(request.customerPhone, config, "contact"),
      delivery_area: request.deliveryArea ?? null,
      location_mode: request.deliveryLocationMode,
      payment_note_type: request.paymentNoteType,
      disclaimer_accepted_at: acceptedAt,
      request_metadata: {
        vendor_slug: vendor.slug,
        customer_name_present: request.customerName.trim().length > 0,
        delivery_address_provided: Boolean(request.deliveryAddress),
        order_note_provided: Boolean(request.orderNote),
        payment_note_label: formatPaymentNote(request.paymentNoteType),
      },
    }),
    cache: "no-store",
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      `Rider contact intent insert failed: ${response.status}`,
      502,
    );
  }

  const row = Array.isArray(payload)
    ? payload[0] as InsertedContactIntentRow | undefined
    : null;

  if (!row?.id) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      "Rider contact intent insert returned an unexpected payload.",
      502,
    );
  }

  return row.id;
}

async function insertUnavailableReport(
  vendor: VendorRiderTarget,
  request: RiderUnavailableReportRequest,
  config: RiderConnectConfig,
): Promise<string> {
  const url = new URL("/rest/v1/rider_unavailable_reports", config.url);
  url.searchParams.set("select", "id");

  const response = await fetch(url, {
    method: "POST",
    headers: createServiceRoleHeaders(config, "return=representation"),
    body: JSON.stringify({
      vendor_id: vendor.id,
      rider_id: request.riderId,
      reason: request.reason,
      reporter_phone_hash: request.reporterPhone
        ? hashPhoneForStorage(request.reporterPhone, config, "unavailable_report")
        : null,
    }),
    cache: "no-store",
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      `Rider unavailable report insert failed: ${response.status}`,
      502,
    );
  }

  const row = Array.isArray(payload)
    ? payload[0] as InsertedUnavailableReportRow | undefined
    : null;

  if (!row?.id) {
    throw new RiderConnectServiceError(
      "UPSTREAM_ERROR",
      "Rider unavailable report insert returned an unexpected payload.",
      502,
    );
  }

  return row.id;
}

export async function getPublicRiderSuggestionsForVendor(
  slug: string,
): Promise<RiderSuggestionsResponseData> {
  const config = getRiderConnectConfig();
  const vendor = await fetchVendorTarget(slug, config);

  if (!vendor) {
    throw new RiderConnectServiceError("NOT_FOUND", "Vendor was not found.", 404);
  }

  const riders = createAvailableRiderShortlist(await fetchVisibleVerifiedRiders(config));

  return {
    vendor_slug: vendor.slug,
    riders,
  };
}

export async function createRiderContactHandoff(
  slug: string,
  request: RiderContactHandoffRequest,
): Promise<RiderContactHandoffResponseData> {
  const config = getRiderConnectConfig();
  const vendor = await fetchVendorTarget(slug, config);

  if (!vendor) {
    throw new RiderConnectServiceError("NOT_FOUND", "Vendor was not found.", 404);
  }

  const riderRow = await fetchSelectedVisibleRider(request.riderId, config);

  if (!riderRow) {
    throw new RiderConnectServiceError("NOT_FOUND", "Rider was not found.", 404);
  }

  if (!isRiderAvailableNow(riderRow)) {
    throw new RiderConnectServiceError("NOT_FOUND", "Rider is not currently available.", 404);
  }

  const rider = toPublicRiderHandoff(riderRow);
  const whatsappUrl = createWhatsAppUrl(
    riderRow.whatsapp_phone,
    buildWhatsAppMessage(vendor, rider, request),
  );
  const intentId = await insertContactIntent(vendor, rider, request, config);

  return riderContactHandoffResponseDataSchema.parse({
    intent_id: intentId,
    whatsapp_url: whatsappUrl,
    rider,
  });
}

export async function createRiderUnavailableReport(
  slug: string,
  request: RiderUnavailableReportRequest,
): Promise<RiderUnavailableReportResponseData> {
  const config = getRiderConnectConfig();
  const vendor = await fetchVendorTarget(slug, config);

  if (!vendor) {
    throw new RiderConnectServiceError("NOT_FOUND", "Vendor was not found.", 404);
  }

  const rider = await fetchReportableVisibleRider(request.riderId, config);

  if (!rider) {
    throw new RiderConnectServiceError("NOT_FOUND", "Rider was not found.", 404);
  }

  const reportId = await insertUnavailableReport(vendor, request, config);

  return riderUnavailableReportResponseDataSchema.parse({
    received: true,
    report_id: reportId,
    message: "Thanks. Localman saved this rider availability report for admin review.",
  });
}
