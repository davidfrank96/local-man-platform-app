import {
  createVendorRequestSchema,
  replaceVendorHoursRequestSchema,
} from "../validation/schemas.ts";
import {
  attachVendorCategory,
  createVendor,
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
import type {
  CreateVendorRequest,
  ReplaceVendorHoursRequest,
} from "../../types/index.ts";

export type VendorIntakeRowInput = {
  row_number?: number | null;
  vendor_name?: string | number | null;
  category?: string | number | null;
  address?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  phone?: string | number | null;
  opening_time?: string | number | null;
  closing_time?: string | number | null;
  description?: string | number | null;
};

export type VendorIntakePreviewRow = {
  rowNumber: number;
  vendor_name: string | null;
  slug: string | null;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  opening_time: string | null;
  closing_time: string | null;
  description: string | null;
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
  hoursData: ReplaceVendorHoursRequest | null;
  categoryId: string;
};

type VendorIntakeContext = {
  session: AdminSession;
  config?: AdminAuthConfig | null;
  fetchImpl?: typeof fetch;
};

const DUPLICATE_DISTANCE_KM = 0.2;

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

function createWeeklyHours(openingTime: string, closingTime: string): ReplaceVendorHoursRequest {
  return replaceVendorHoursRequestSchema.parse({
    hours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      day_of_week: dayOfWeek,
      open_time: openingTime,
      close_time: closingTime,
      is_closed: false,
    })),
  });
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
  const sluggedRows = new Map<string, Array<{
    rowNumber: number;
    locationKey: string | null;
    latitude: number | null;
    longitude: number | null;
  }>>();

  for (const [index, row] of rows.entries()) {
    const vendorName = normalizeText(row.vendor_name);
    const slug = vendorName ? slugifyVendorName(vendorName) : null;
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
  const duplicateCandidates = await listPotentialDuplicateVendors(
    [...sluggedRows.keys()],
    context,
  );

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
    const categorySlug = normalizeNullableText(row.category)?.toLowerCase() ?? null;
    const address = normalizeNullableText(row.address);
    const phone = normalizeNullableText(row.phone);
    const description = normalizeNullableText(row.description);
    const rawOpeningTime = normalizeNullableText(row.opening_time);
    const rawClosingTime = normalizeNullableText(row.closing_time);
    const latitude = normalizeCoordinate(row.latitude);
    const longitude = normalizeCoordinate(row.longitude);
    const slug = vendorName ? slugifyVendorName(vendorName) : null;
    const issues: VendorIntakeIssue[] = [];
    const locationKey = normalizeLocationKey(address);

    if (!vendorName) {
      issues.push(createIssue(rowNumber, "vendor_name", "Missing vendor name.", "REQUIRED_FIELD"));
    }

    if (!categorySlug) {
      issues.push(createIssue(rowNumber, "category", "Missing category.", "REQUIRED_FIELD"));
    } else if (!categoryBySlug.has(categorySlug)) {
      issues.push(createIssue(rowNumber, "category", "Invalid category.", "INVALID_CATEGORY"));
    }

    if (!address) {
      issues.push(createIssue(rowNumber, "address", "Missing address.", "REQUIRED_FIELD"));
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
        issues.push(createIssue(rowNumber, "longitude", "Invalid longitude.", "INVALID_COORDINATE"));
      }
    }

    let openingTime: string | null = null;
    let closingTime: string | null = null;
    let hoursData: ReplaceVendorHoursRequest | null = null;

    if (Boolean(rawOpeningTime) !== Boolean(rawClosingTime)) {
      issues.push(
        createIssue(
          rowNumber,
          "opening_time",
          "opening_time and closing_time must both be provided together.",
          "INCOMPLETE_HOURS",
        ),
      );
      issues.push(
        createIssue(
          rowNumber,
          "closing_time",
          "opening_time and closing_time must both be provided together.",
          "INCOMPLETE_HOURS",
        ),
      );
    } else if (rawOpeningTime && rawClosingTime) {
      try {
        openingTime = parseAdminTimeInputTo24Hour(rawOpeningTime);
        closingTime = parseAdminTimeInputTo24Hour(rawClosingTime);
        hoursData = createWeeklyHours(openingTime ?? "", closingTime ?? "");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid time format.";
        issues.push(createIssue(rowNumber, "opening_time", message, "INVALID_TIME"));
        issues.push(createIssue(rowNumber, "closing_time", message, "INVALID_TIME"));
      }
    }

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

        return calculateDistanceKm(
          { lat: latitude, lng: longitude },
          { lat: candidate.latitude, lng: candidate.longitude },
        ) <= DUPLICATE_DISTANCE_KM;
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
        })
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

    const preview: VendorIntakePreviewRow = {
      rowNumber,
      vendor_name: vendorName,
      slug,
      category: categorySlug,
      address,
      latitude: latitude === null || Number.isNaN(latitude) ? null : latitude,
      longitude: longitude === null || Number.isNaN(longitude) ? null : longitude,
      phone,
      opening_time: rawOpeningTime,
      closing_time: rawClosingTime,
      description,
      issues,
      errors: issues.map((issue) => issue.error),
    };
    previewRows.push(preview);

    if (issues.length > 0 || !vendorName || !slug || !categorySlug || !address) {
      invalidRows.push(preview);
      continue;
    }

    const createVendorData = createVendorRequestSchema.parse({
      name: vendorName,
      slug,
      short_description: description,
      phone_number: phone,
      address_text: address,
      city: null,
      area: address,
      state: null,
      country: null,
      latitude,
      longitude,
      price_band: null,
      is_active: true,
      is_open_override: null,
    });

    validRows.push({
      preview,
      createVendorData,
      hoursData,
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
    try {
      const vendor = await createVendor(row.createVendorData, context);
      await attachVendorCategory({ id: vendor.id }, row.categoryId, context);

      if (row.hoursData) {
        await replaceVendorHours({ id: vendor.id }, row.hoursData, context);
      }

      uploadedRows.push({
        rowNumber: row.preview.rowNumber,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
        },
      });
    } catch (error) {
      failedRows.push({
        rowNumber: row.preview.rowNumber,
        vendor_name: row.preview.vendor_name,
        error: error instanceof Error ? error.message : "Vendor upload failed.",
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
      ...failedRows.map((row) =>
        createIssue(row.rowNumber, "row", row.error, "UPLOAD_FAILED")
      ),
    ],
  };
}
