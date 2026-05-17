import { createHash } from "node:crypto";
import {
  publicRiderSuggestionSchema,
  riderContactHandoffResponseDataSchema,
} from "../validation/index.ts";
import {
  getSupabaseServiceRoleConfig,
} from "../vendors/supabase.ts";
import type {
  PublicRiderSuggestion,
  RiderContactHandoffRequest,
  RiderContactHandoffResponseData,
  RiderPaymentNoteType,
  RiderSuggestionsResponseData,
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
  operating_areas: string[] | null;
  usual_available_hours: Record<string, unknown> | null;
};

type RiderContactRow = PublicRiderSuggestionRow & {
  whatsapp_phone: string;
};

type InsertedContactIntentRow = {
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

const riderContactSelect = `${riderPublicSelect},whatsapp_phone`;

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
    display_name: row.display_name,
    photo_url: row.photo_url,
    vehicle_type: row.vehicle_type,
    operating_areas: row.operating_areas ?? [],
    usual_availability_label: getUsualAvailabilityLabel(row.usual_available_hours),
  });
}

function normalizeArea(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function riderMatchesVendorArea(rider: PublicRiderSuggestion, vendorArea: string | null): boolean {
  const normalizedVendorArea = normalizeArea(vendorArea);

  if (!normalizedVendorArea) {
    return false;
  }

  return rider.operating_areas.some((area) => normalizeArea(area) === normalizedVendorArea);
}

function sortRidersForVendor(
  riders: PublicRiderSuggestion[],
  vendorArea: string | null,
): PublicRiderSuggestion[] {
  return [...riders].sort((left, right) => {
    const leftMatches = riderMatchesVendorArea(left, vendorArea);
    const rightMatches = riderMatchesVendorArea(right, vendorArea);

    if (leftMatches !== rightMatches) {
      return leftMatches ? -1 : 1;
    }

    return left.display_name.localeCompare(right.display_name);
  });
}

async function fetchVisibleVerifiedRiders(
  config: RiderConnectConfig,
): Promise<PublicRiderSuggestion[]> {
  const url = new URL("/rest/v1/riders", config.url);
  url.searchParams.set("select", riderPublicSelect);
  url.searchParams.set("verification_status", "eq.verified");
  url.searchParams.set("visibility_status", "eq.visible");
  url.searchParams.set("order", "display_name.asc");
  url.searchParams.set("limit", "50");

  const rows = await fetchServiceJson<PublicRiderSuggestionRow[]>(
    url,
    config,
    "Rider suggestion lookup failed",
  );

  return rows.map(toPublicRiderSuggestion);
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

function hashCustomerPhone(phone: string): string {
  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  return createHash("sha256")
    .update(`localman-rider-contact:${normalizedPhone}`)
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

function createWhatsAppPhonePath(phone: string): string {
  return phone.replace(/[^\d]/g, "");
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
    vendor.phone_number ?? "Vendor phone not listed",
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
    request.customerPhone,
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
      customer_phone_hash: hashCustomerPhone(request.customerPhone),
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

export async function getPublicRiderSuggestionsForVendor(
  slug: string,
): Promise<RiderSuggestionsResponseData> {
  const config = getRiderConnectConfig();
  const vendor = await fetchVendorTarget(slug, config);

  if (!vendor) {
    throw new RiderConnectServiceError("NOT_FOUND", "Vendor was not found.", 404);
  }

  const riders = sortRidersForVendor(
    await fetchVisibleVerifiedRiders(config),
    vendor.area,
  );

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

  const rider = toPublicRiderSuggestion(riderRow);
  const intentId = await insertContactIntent(vendor, rider, request, config);
  const whatsappUrl = createWhatsAppUrl(
    riderRow.whatsapp_phone,
    buildWhatsAppMessage(vendor, rider, request),
  );

  return riderContactHandoffResponseDataSchema.parse({
    intent_id: intentId,
    whatsapp_url: whatsappUrl,
    rider,
  });
}
