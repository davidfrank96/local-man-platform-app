import {
  createVendorDishesRequestSchema,
  createVendorRequestSchema,
  replaceVendorHoursRequestSchema,
  vendorImageMetadataRequestSchema,
} from "../validation/schemas.ts";
import {
  attachVendorCategory,
  createVendor,
  createVendorDishes,
  createVendorImages,
  hardDeleteVendor,
  listPotentialDuplicateVendors,
  listVendorCategories,
  replaceVendorHours,
  type VendorDuplicateCandidateRecord,
  type VendorSummaryRecord,
} from "./vendor-service.ts";
import type {
  AdminAuthConfig,
  AdminSession,
} from "./auth.ts";
import { parseAdminTimeInputTo24Hour } from "./hours-input.ts";
import { slugifyVendorName } from "./slug.ts";
import { calculateDistanceKm } from "../location/distance.ts";
import {
  vendorCsvDayFields,
  vendorCsvDishSlots,
  vendorCsvImageSlots,
} from "./vendor-intake-contract.ts";
import type {
  CreateVendorDishesRequest,
  CreateVendorRequest,
  ReplaceVendorHoursRequest,
  VendorImageMetadataRequest,
} from "../../types/index.ts";

export type VendorIntakeRowInput = {
  row_number?: number | null;
  vendor_name?: string | number | null;
  slug?: string | number | null;
  category?: string | number | null;
  price_band?: string | number | null;
  description?: string | number | null;
  phone?: string | number | null;
  address?: string | number | null;
  area?: string | number | null;
  city?: string | number | null;
  state?: string | number | null;
  country?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: string | number | null;
  monday_open?: string | number | null;
  monday_close?: string | number | null;
  tuesday_open?: string | number | null;
  tuesday_close?: string | number | null;
  wednesday_open?: string | number | null;
  wednesday_close?: string | number | null;
  thursday_open?: string | number | null;
  thursday_close?: string | number | null;
  friday_open?: string | number | null;
  friday_close?: string | number | null;
  saturday_open?: string | number | null;
  saturday_close?: string | number | null;
  sunday_open?: string | number | null;
  sunday_close?: string | number | null;
  dish_1_name?: string | number | null;
  dish_1_description?: string | number | null;
  dish_1_image_url?: string | number | null;
  dish_2_name?: string | number | null;
  dish_2_description?: string | number | null;
  dish_2_image_url?: string | number | null;
  image_url_1?: string | number | null;
  image_sort_order_1?: string | number | null;
  image_url_2?: string | number | null;
  image_sort_order_2?: string | number | null;
};

export type VendorIntakePreviewRow = {
  rowNumber: number;
  vendor_name: string | null;
  slug: string | null;
  category: string | null;
  price_band: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  description: string | null;
  is_active: boolean;
  open_days: number;
  featured_dishes: string[];
  image_urls: string[];
  issues: VendorIntakeIssue[];
  errors: string[];
};

export type VendorIntakeIssue = {
  row: number;
  field: string;
  error: string;
  code: string;
};

export type VendorIntakePreviewResult = {
  totalRows: number;
  rows: VendorIntakePreviewRow[];
  validRows: VendorIntakePreviewRow[];
  invalidRows: VendorIntakePreviewRow[];
};

export type VendorIntakeUploadResult = VendorIntakePreviewResult & {
  uploadedRows: Array<{
    rowNumber: number;
    vendor: Pick<VendorSummaryRecord, "id" | "name" | "slug">;
  }>;
  failedRows: Array<{
    rowNumber: number;
    vendor_name: string | null;
    error: string;
  }>;
  successCount: number;
  failedCount: number;
  errors: VendorIntakeIssue[];
};

type PreparedVendorIntakeRow = {
  preview: VendorIntakePreviewRow;
  createVendorData: CreateVendorRequest;
  hoursData: ReplaceVendorHoursRequest;
  categoryId: string;
  dishesData: CreateVendorDishesRequest;
  imagesData: VendorImageMetadataRequest;
};

type VendorIntakeContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

type DayHoursDraft = {
  day_of_week: number;
  fieldKey: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const DUPLICATE_DISTANCE_KM = 0.2;
const validPriceBands = new Set(["budget", "standard", "premium"]);

function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: string | number | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeCoordinate(value: string | number | null | undefined): number | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeInteger(value: string | number | null | undefined): number | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function normalizeBoolean(
  value: string | number | null | undefined,
): boolean | null | typeof Number.NaN {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  return Number.NaN;
}

function normalizeLocationKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

function createIssue(
  row: number,
  field: string,
  error: string,
  code: string,
): VendorIntakeIssue {
  return {
    row,
    field,
    error,
    code,
  };
}

function matchesExistingVendor(
  candidate: VendorDuplicateCandidateRecord,
  row: {
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  },
): boolean {
  const candidateLocation = normalizeLocationKey(candidate.address_text ?? candidate.area);
  const rowLocation = normalizeLocationKey(row.address);

  if (candidateLocation && rowLocation && candidateLocation === rowLocation) {
    return true;
  }

  if (
    row.latitude === null ||
    row.longitude === null ||
    !Number.isFinite(row.latitude) ||
    !Number.isFinite(row.longitude)
  ) {
    return false;
  }

  return calculateDistanceKm(
    { lat: row.latitude, lng: row.longitude },
    { lat: candidate.latitude, lng: candidate.longitude },
  ) <= DUPLICATE_DISTANCE_KM;
}

function createHoursDraft(
  row: VendorIntakeRowInput,
  rowNumber: number,
  issues: VendorIntakeIssue[],
): DayHoursDraft[] {
  const hoursDraft = vendorCsvDayFields.map(({ dayOfWeek, key }) => {
    const rawOpen = normalizeNullableText(row[`${key}_open` as keyof VendorIntakeRowInput]);
    const rawClose = normalizeNullableText(row[`${key}_close` as keyof VendorIntakeRowInput]);

    if (Boolean(rawOpen) !== Boolean(rawClose)) {
      issues.push(
        createIssue(
          rowNumber,
          `${key}_open`,
          `${key}_open and ${key}_close must both be provided together.`,
          "INCOMPLETE_HOURS",
        ),
      );
      issues.push(
        createIssue(
          rowNumber,
          `${key}_close`,
          `${key}_open and ${key}_close must both be provided together.`,
          "INCOMPLETE_HOURS",
        ),
      );
      return {
        day_of_week: dayOfWeek,
        fieldKey: key,
        open_time: null,
        close_time: null,
        is_closed: true,
      };
    }

    if (!rawOpen && !rawClose) {
      return {
        day_of_week: dayOfWeek,
        fieldKey: key,
        open_time: null,
        close_time: null,
        is_closed: true,
      };
    }

    try {
      return {
        day_of_week: dayOfWeek,
        fieldKey: key,
        open_time: parseAdminTimeInputTo24Hour(rawOpen ?? ""),
        close_time: parseAdminTimeInputTo24Hour(rawClose ?? ""),
        is_closed: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid time format.";
      issues.push(createIssue(rowNumber, `${key}_open`, message, "INVALID_TIME"));
      issues.push(createIssue(rowNumber, `${key}_close`, message, "INVALID_TIME"));
      return {
        day_of_week: dayOfWeek,
        fieldKey: key,
        open_time: null,
        close_time: null,
        is_closed: true,
      };
    }
  });

  if (!hoursDraft.some((entry) => !entry.is_closed)) {
    issues.push(
      createIssue(
        rowNumber,
        "monday_open",
        "At least one day of operating hours is required.",
        "REQUIRED_HOURS",
      ),
    );
  }

  return hoursDraft;
}

function createDishesDraft(
  row: VendorIntakeRowInput,
  rowNumber: number,
  issues: VendorIntakeIssue[],
): CreateVendorDishesRequest | null {
  const dishes = vendorCsvDishSlots.flatMap((slot) => {
    const dishName = normalizeNullableText(row[`dish_${slot}_name` as keyof VendorIntakeRowInput]);
    const description = normalizeNullableText(
      row[`dish_${slot}_description` as keyof VendorIntakeRowInput],
    );
    const imageUrl = normalizeNullableText(
      row[`dish_${slot}_image_url` as keyof VendorIntakeRowInput],
    );

    if (!dishName && !description && !imageUrl) {
      return [];
    }

    if (!dishName) {
      issues.push(
        createIssue(
          rowNumber,
          `dish_${slot}_name`,
          `dish_${slot}_name is required when featured dish details are provided.`,
          "REQUIRED_FIELD",
        ),
      );
      return [];
    }

    return [
      {
        dish_name: dishName,
        description,
        image_url: imageUrl,
        is_featured: true,
      },
    ];
  });

  if (dishes.length === 0) {
    issues.push(
      createIssue(
        rowNumber,
        "dish_1_name",
        "At least one featured dish is required.",
        "REQUIRED_DISH",
      ),
    );
    return null;
  }

  return createVendorDishesRequestSchema.parse({ dishes });
}

function createImagesDraft(
  row: VendorIntakeRowInput,
  rowNumber: number,
  issues: VendorIntakeIssue[],
): VendorImageMetadataRequest | null {
  const images = vendorCsvImageSlots.flatMap((slot) => {
    const imageUrl = normalizeNullableText(row[`image_url_${slot}` as keyof VendorIntakeRowInput]);
    const sortOrderValue = normalizeInteger(
      row[`image_sort_order_${slot}` as keyof VendorIntakeRowInput],
    );

    if (!imageUrl && sortOrderValue === null) {
      return [];
    }

    if (!imageUrl) {
      issues.push(
        createIssue(
          rowNumber,
          `image_url_${slot}`,
          `image_url_${slot} is required when image_sort_order_${slot} is provided.`,
          "REQUIRED_FIELD",
        ),
      );
      return [];
    }

    if (sortOrderValue !== null && Number.isNaN(sortOrderValue)) {
      issues.push(
        createIssue(
          rowNumber,
          `image_sort_order_${slot}`,
          `image_sort_order_${slot} must be a whole number.`,
          "INVALID_INTEGER",
        ),
      );
      return [];
    }

    return [
      {
        image_url: imageUrl,
        storage_object_path: null,
        sort_order: sortOrderValue ?? slot - 1,
      },
    ];
  });

  if (images.length === 0) {
    issues.push(
      createIssue(
        rowNumber,
        "image_url_1",
        "At least one remote image URL is required.",
        "REQUIRED_IMAGE",
      ),
    );
    return null;
  }

  return vendorImageMetadataRequestSchema.parse({ images });
}

async function prepareVendorIntakeRows(
  rows: VendorIntakeRowInput[],
  context: VendorIntakeContext,
): Promise<{
  rows: VendorIntakePreviewRow[];
  validRows: PreparedVendorIntakeRow[];
  invalidRows: VendorIntakePreviewRow[];
}> {
  const categories = await listVendorCategories(context);
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const sluggedRows = new Map<
    string,
    Array<{
      rowNumber: number;
      locationKey: string | null;
      latitude: number | null;
      longitude: number | null;
    }>
  >();

  for (const [index, row] of rows.entries()) {
    const vendorName = normalizeText(row.vendor_name);
    const providedSlug = normalizeNullableText(row.slug);
    const slug = providedSlug ?? (vendorName ? slugifyVendorName(vendorName) : null);
    const latitude = normalizeCoordinate(row.latitude);
    const longitude = normalizeCoordinate(row.longitude);
    const rowNumber = row.row_number ?? index + 2;

    if (!slug) {
      continue;
    }

    const bucket = sluggedRows.get(slug) ?? [];
    bucket.push({
      rowNumber,
      locationKey: normalizeLocationKey(normalizeNullableText(row.address)),
      latitude: latitude === null || Number.isNaN(latitude) ? null : latitude,
      longitude: longitude === null || Number.isNaN(longitude) ? null : longitude,
    });
    sluggedRows.set(slug, bucket);
  }

  const duplicateCandidatesBySlug = new Map(
    [...sluggedRows.keys()].map((slug) => [slug, [] as VendorDuplicateCandidateRecord[]]),
  );
  const duplicateCandidates = await listPotentialDuplicateVendors([...sluggedRows.keys()], context);

  for (const candidate of duplicateCandidates) {
    const bucket = duplicateCandidatesBySlug.get(candidate.slug) ?? [];
    bucket.push(candidate);
    duplicateCandidatesBySlug.set(candidate.slug, bucket);
  }

  const previewRows: VendorIntakePreviewRow[] = [];
  const validRows: PreparedVendorIntakeRow[] = [];
  const invalidRows: VendorIntakePreviewRow[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = row.row_number ?? index + 2;
    const vendorName = normalizeNullableText(row.vendor_name);
    const providedSlug = normalizeNullableText(row.slug);
    const slug = providedSlug ?? (vendorName ? slugifyVendorName(vendorName) : null);
    const categorySlug = normalizeNullableText(row.category)?.toLowerCase() ?? null;
    const priceBand = normalizeNullableText(row.price_band)?.toLowerCase() ?? null;
    const description = normalizeNullableText(row.description);
    const phone = normalizeNullableText(row.phone);
    const address = normalizeNullableText(row.address);
    const area = normalizeNullableText(row.area);
    const city = normalizeNullableText(row.city);
    const state = normalizeNullableText(row.state);
    const country = normalizeNullableText(row.country);
    const latitude = normalizeCoordinate(row.latitude);
    const longitude = normalizeCoordinate(row.longitude);
    const isActiveInput = normalizeBoolean(row.is_active);
    const isActive = isActiveInput === null ? true : Boolean(isActiveInput);
    const issues: VendorIntakeIssue[] = [];
    const locationKey = normalizeLocationKey(address);

    if (!vendorName) {
      issues.push(createIssue(rowNumber, "vendor_name", "Missing vendor name.", "REQUIRED_FIELD"));
    }

    if (providedSlug && !slug) {
      issues.push(createIssue(rowNumber, "slug", "Invalid slug.", "INVALID_SLUG"));
    }

    if (!categorySlug) {
      issues.push(createIssue(rowNumber, "category", "Missing category.", "REQUIRED_FIELD"));
    } else if (!categoryBySlug.has(categorySlug)) {
      issues.push(
        createIssue(
          rowNumber,
          "category",
          `category "${categorySlug}" does not exist.`,
          "INVALID_CATEGORY",
        ),
      );
    }

    if (!priceBand) {
      issues.push(createIssue(rowNumber, "price_band", "Missing price_band.", "REQUIRED_FIELD"));
    } else if (!validPriceBands.has(priceBand)) {
      issues.push(
        createIssue(
          rowNumber,
          "price_band",
          "price_band must be one of budget, standard, or premium.",
          "INVALID_PRICE_BAND",
        ),
      );
    }

    if (!description) {
      issues.push(createIssue(rowNumber, "description", "Missing description.", "REQUIRED_FIELD"));
    }

    if (!phone) {
      issues.push(createIssue(rowNumber, "phone", "Missing phone.", "REQUIRED_FIELD"));
    }

    if (!address) {
      issues.push(createIssue(rowNumber, "address", "Missing address.", "REQUIRED_FIELD"));
    }

    if (!area) {
      issues.push(createIssue(rowNumber, "area", "Missing area.", "REQUIRED_FIELD"));
    }

    if (!city) {
      issues.push(createIssue(rowNumber, "city", "Missing city.", "REQUIRED_FIELD"));
    }

    if (!state) {
      issues.push(createIssue(rowNumber, "state", "Missing state.", "REQUIRED_FIELD"));
    }

    if (!country) {
      issues.push(createIssue(rowNumber, "country", "Missing country.", "REQUIRED_FIELD"));
    }

    const hasLatitude = latitude !== null;
    const hasLongitude = longitude !== null;

    if (hasLatitude !== hasLongitude) {
      issues.push(
        createIssue(
          rowNumber,
          "latitude",
          "Latitude and longitude must both be provided together.",
          "INCOMPLETE_COORDINATES",
        ),
      );
      issues.push(
        createIssue(
          rowNumber,
          "longitude",
          "Latitude and longitude must both be provided together.",
          "INCOMPLETE_COORDINATES",
        ),
      );
    } else if (!hasLatitude || !hasLongitude) {
      issues.push(
        createIssue(
          rowNumber,
          "latitude",
          "Latitude and longitude are required for vendor upload.",
          "REQUIRED_COORDINATES",
        ),
      );
      issues.push(
        createIssue(
          rowNumber,
          "longitude",
          "Latitude and longitude are required for vendor upload.",
          "REQUIRED_COORDINATES",
        ),
      );
    } else {
      if (Number.isNaN(latitude)) {
        issues.push(createIssue(rowNumber, "latitude", "Invalid latitude.", "INVALID_COORDINATE"));
      }

      if (Number.isNaN(longitude)) {
        issues.push(
          createIssue(rowNumber, "longitude", "Invalid longitude.", "INVALID_COORDINATE"),
        );
      }
    }

    if (isActiveInput !== null && Number.isNaN(isActiveInput)) {
      issues.push(
        createIssue(
          rowNumber,
          "is_active",
          "is_active must be true, false, 1, or 0.",
          "INVALID_BOOLEAN",
        ),
      );
    } else if (!isActive && context.session.adminUser.role !== "admin") {
      issues.push(
        createIssue(
          rowNumber,
          "is_active",
          "Only admins can create inactive vendors.",
          "FORBIDDEN_INACTIVE_VENDOR",
        ),
      );
    }

    const hoursDraft = createHoursDraft(row, rowNumber, issues);
    const openDays = hoursDraft.filter((entry) => !entry.is_closed).length;
    const dishesData = createDishesDraft(row, rowNumber, issues);
    const imagesData = createImagesDraft(row, rowNumber, issues);

    if (slug) {
      const matchingRows = (sluggedRows.get(slug) ?? []).filter((candidate) => {
        if (candidate.rowNumber === rowNumber) {
          return false;
        }

        if (candidate.locationKey && locationKey && candidate.locationKey === locationKey) {
          return true;
        }

        if (
          candidate.latitude === null ||
          candidate.longitude === null ||
          latitude === null ||
          longitude === null ||
          Number.isNaN(latitude) ||
          Number.isNaN(longitude)
        ) {
          return false;
        }

        return (
          calculateDistanceKm(
            { lat: latitude, lng: longitude },
            { lat: candidate.latitude, lng: candidate.longitude },
          ) <= DUPLICATE_DISTANCE_KM
        );
      });

      if (matchingRows.length > 0) {
        issues.push(
          createIssue(
            rowNumber,
            "vendor_name",
            "Duplicate vendor in this CSV file.",
            "DUPLICATE_IN_FILE",
          ),
        );
      }
    }

    if (
      slug &&
      duplicateCandidatesBySlug.get(slug)?.some((candidate) =>
        matchesExistingVendor(candidate, {
          address,
          latitude: latitude === null || Number.isNaN(latitude) ? null : latitude,
          longitude: longitude === null || Number.isNaN(longitude) ? null : longitude,
        }),
      )
    ) {
      issues.push(
        createIssue(
          rowNumber,
          "vendor_name",
          "Vendor already exists in system.",
          "DUPLICATE_EXISTING_VENDOR",
        ),
      );
    }

    let createVendorData: CreateVendorRequest | null = null;
    let hoursData: ReplaceVendorHoursRequest | null = null;

    if (issues.length === 0) {
      try {
        createVendorData = createVendorRequestSchema.parse({
          name: vendorName,
          slug,
          short_description: description,
          phone_number: phone,
          address_text: address,
          city,
          area,
          state,
          country,
          latitude,
          longitude,
          price_band: priceBand,
          is_active: isActive,
          is_open_override: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid vendor row.";
        issues.push(createIssue(rowNumber, "row", message, "INVALID_VENDOR_PAYLOAD"));
      }

      try {
        hoursData = replaceVendorHoursRequestSchema.parse({
          hours: hoursDraft.map((entry) => ({
            day_of_week: entry.day_of_week,
            open_time: entry.open_time,
            close_time: entry.close_time,
            is_closed: entry.is_closed,
          })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid weekly hours.";
        issues.push(createIssue(rowNumber, "row", message, "INVALID_HOURS_PAYLOAD"));
      }
    }

    const preview: VendorIntakePreviewRow = {
      rowNumber,
      vendor_name: vendorName,
      slug,
      category: categorySlug,
      price_band: priceBand,
      address,
      area,
      city,
      state,
      country,
      latitude: latitude === null || Number.isNaN(latitude) ? null : latitude,
      longitude: longitude === null || Number.isNaN(longitude) ? null : longitude,
      phone,
      description,
      is_active: isActive,
      open_days: openDays,
      featured_dishes: dishesData?.dishes.map((dish) => dish.dish_name) ?? [],
      image_urls: imagesData?.images.map((image) => image.image_url) ?? [],
      issues,
      errors: issues.map((issue) => issue.error),
    };
    previewRows.push(preview);

    if (
      issues.length > 0 ||
      !createVendorData ||
      !hoursData ||
      !dishesData ||
      !imagesData ||
      !categorySlug
    ) {
      invalidRows.push(preview);
      continue;
    }

    validRows.push({
      preview,
      createVendorData,
      hoursData,
      dishesData,
      imagesData,
      categoryId: categoryBySlug.get(categorySlug)?.id ?? "",
    });
  }

  return {
    rows: previewRows,
    validRows,
    invalidRows,
  };
}

export async function previewVendorIntake(
  rows: VendorIntakeRowInput[],
  context: VendorIntakeContext,
): Promise<VendorIntakePreviewResult> {
  const prepared = await prepareVendorIntakeRows(rows, context);

  return {
    totalRows: rows.length,
    rows: prepared.rows,
    validRows: prepared.validRows.map((row) => row.preview),
    invalidRows: prepared.invalidRows,
  };
}

export async function uploadVendorIntake(
  rows: VendorIntakeRowInput[],
  context: VendorIntakeContext,
): Promise<VendorIntakeUploadResult> {
  const prepared = await prepareVendorIntakeRows(rows, context);

  const uploadedRows: VendorIntakeUploadResult["uploadedRows"] = [];
  const failedRows: VendorIntakeUploadResult["failedRows"] = [];

  for (const row of prepared.validRows) {
    let createdVendor: VendorSummaryRecord | null = null;

    try {
      createdVendor = await createVendor(row.createVendorData, context);
      await attachVendorCategory({ id: createdVendor.id }, row.categoryId, context);
      await replaceVendorHours({ id: createdVendor.id }, row.hoursData, context);
      await createVendorDishes({ id: createdVendor.id }, row.dishesData, context);
      await createVendorImages({ id: createdVendor.id }, row.imagesData, context);

      uploadedRows.push({
        rowNumber: row.preview.rowNumber,
        vendor: {
          id: createdVendor.id,
          name: createdVendor.name,
          slug: createdVendor.slug,
        },
      });
    } catch (error) {
      let message = error instanceof Error ? error.message : "Vendor upload failed.";

      if (createdVendor) {
        try {
          await hardDeleteVendor({ id: createdVendor.id }, context);
        } catch (rollbackError) {
          const rollbackMessage =
            rollbackError instanceof Error
              ? rollbackError.message
              : "Rollback failed after vendor creation.";
          message = `${message} Cleanup failed: ${rollbackMessage}`;
        }
      }

      failedRows.push({
        rowNumber: row.preview.rowNumber,
        vendor_name: row.preview.vendor_name,
        error: message,
      });
    }
  }

  return {
    totalRows: rows.length,
    rows: prepared.rows,
    validRows: prepared.validRows.map((row) => row.preview),
    invalidRows: prepared.invalidRows,
    uploadedRows,
    failedRows,
    successCount: uploadedRows.length,
    failedCount: prepared.invalidRows.length + failedRows.length,
    errors: [
      ...prepared.invalidRows.flatMap((row) => row.issues),
      ...failedRows.map((row) => createIssue(row.rowNumber, "row", row.error, "UPLOAD_FAILED")),
    ],
  };
}
