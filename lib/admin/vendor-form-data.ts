import type {
  CreateManagedVendorRequest,
  CreateVendorDishesRequest,
  PriceBand,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
} from "../../types/index.ts";
import { parseAdminTimeInputTo24Hour } from "./hours-input.ts";
import type { AdminVendorSummary } from "./api-client.ts";

export const priceBands: PriceBand[] = ["budget", "standard", "premium"];

export const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type AdminVendorFieldErrors = Partial<Record<
  | "name"
  | "slug"
  | "category_slug"
  | "phone_number"
  | "area"
  | "latitude"
  | "longitude"
  | "price_band"
  | "short_description"
  | "address_text"
  | "city"
  | "state"
  | "country",
  string
>>;

export function readText(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : undefined;
}

function readNullableText(formData: FormData, key: string): string | null {
  return readText(formData, key) ?? null;
}

function readNumber(formData: FormData, key: string): number {
  return Number(String(formData.get(key) ?? ""));
}

export function readPriceBand(formData: FormData, key: string): PriceBand | undefined {
  const value = readText(formData, key);

  return priceBands.includes(value as PriceBand) ? (value as PriceBand) : undefined;
}

export function createHoursPayload(
  formData: FormData,
  prefix = "",
): ReplaceVendorHoursRequest {
  return {
    hours: dayLabels.map((_, dayOfWeek) => {
      const isClosed = formData.get(`${prefix}closed-${dayOfWeek}`) === "on";
      const openTime = isClosed
        ? null
        : parseAdminTimeInputTo24Hour(String(formData.get(`${prefix}open-${dayOfWeek}`) ?? ""));
      const closeTime = isClosed
        ? null
        : parseAdminTimeInputTo24Hour(String(formData.get(`${prefix}close-${dayOfWeek}`) ?? ""));

      return {
        day_of_week: dayOfWeek,
        open_time: openTime,
        close_time: closeTime,
        is_closed: isClosed,
      };
    }),
  };
}

export function createOnboardingDishesPayload(
  formData: FormData,
  rowIds: number[],
): CreateVendorDishesRequest | null {
  const dishes = rowIds
    .map((rowId) => {
      const dishName = String(formData.get(`create-dish-name-${rowId}`) ?? "").trim();

      if (!dishName) {
        return null;
      }

      return {
        dish_name: dishName,
        description: readNullableText(formData, `create-dish-description-${rowId}`),
        image_url: readNullableText(formData, `create-dish-image-url-${rowId}`),
        is_featured: true,
      };
    })
    .filter((dish) => dish !== null);

  return dishes.length > 0 ? { dishes } : null;
}

export function createVendorPayload(formData: FormData): CreateManagedVendorRequest {
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    category_slug: String(formData.get("category_slug") ?? ""),
    short_description: readNullableText(formData, "short_description"),
    phone_number: readNullableText(formData, "phone_number"),
    address_text: readNullableText(formData, "address_text"),
    city: readNullableText(formData, "city"),
    area: readText(formData, "area") ?? "",
    state: readNullableText(formData, "state"),
    country: readNullableText(formData, "country"),
    latitude: readNumber(formData, "latitude"),
    longitude: readNumber(formData, "longitude"),
    price_band: readPriceBand(formData, "price_band") ?? null,
    is_active: true,
    is_open_override: null,
  };
}

export function updateVendorPayload(formData: FormData): UpdateVendorRequest {
  const payload: UpdateVendorRequest = {};
  const textFields = [
    "name",
    "slug",
    "short_description",
    "phone_number",
    "address_text",
    "city",
    "area",
    "state",
    "country",
  ] as const;

  for (const field of textFields) {
    const value = readText(formData, field);
    if (value !== undefined) {
      payload[field] = value;
    }
  }

  const latitude = readText(formData, "latitude");
  const longitude = readText(formData, "longitude");
  const priceBand = readPriceBand(formData, "price_band");

  if (latitude !== undefined) {
    payload.latitude = Number(latitude);
  }

  if (longitude !== undefined) {
    payload.longitude = Number(longitude);
  }

  if (priceBand !== undefined) {
    payload.price_band = priceBand;
  }

  return payload;
}

export function dishesPayload(formData: FormData): CreateVendorDishesRequest {
  return {
    dishes: [
      {
        dish_name: String(formData.get("dish_name") ?? ""),
        description: readNullableText(formData, "description"),
        image_url: readNullableText(formData, "image_url"),
        is_featured: formData.get("is_featured") !== "off",
      },
    ],
  };
}

export function getVendorSummaryStatusLabels(vendor: AdminVendorSummary): string[] {
  const labels: string[] = [];

  labels.push(vendor.is_active ? "Active" : "Inactive");

  if (vendor.hours_count < 7) {
    labels.push("Missing hours");
  }

  if (vendor.images_count < 1) {
    labels.push("Missing images");
  }

  if (vendor.featured_dishes_count < 1) {
    labels.push("Missing featured dishes");
  }

  return labels;
}
