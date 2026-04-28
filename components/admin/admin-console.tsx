"use client";

import Link from "next/link";
import {
  memo,
  useCallback,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AdminApiError,
  deleteAdminVendorDish,
  deleteAdminVendorImage,
  createAdminVendor,
  createAdminVendorDishes,
  createAdminVendorImages,
  deactivateAdminVendor,
  listAdminVendorDishes,
  listAdminVendorImages,
  listAdminVendorHours,
  listAdminVendors,
  replaceAdminVendorHours,
  updateAdminVendor,
  type AdminVendorFilters,
  type AdminVendorSummary,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import { extractValidationFeedback } from "../../lib/admin/form-errors.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  AgentQuickAddPanel,
  VendorCsvUploadPanel,
} from "./admin-vendor-intake.tsx";
import {
  getVendorWorkspaceSnapshot,
  readVendorArtifactCache,
  updateVendorArtifactCache,
  updateVendorWorkspaceSnapshot,
} from "../../lib/admin/workspace-cache.ts";
import type {
  CreateVendorDishesRequest,
  CreateVendorRequest,
  PriceBand,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  VendorFeaturedDish,
  VendorHours,
  VendorImage,
} from "../../types/index.ts";
import {
  getVendorSlugError,
  slugifyVendorName,
} from "../../lib/admin/slug.ts";
import {
  parseAdminTimeInputTo24Hour,
  parseStoredTimeForAdmin,
} from "../../lib/admin/hours-input.ts";
import {
  getAdminRoleLabel,
  hasAdminPermission,
} from "../../lib/admin/rbac.ts";
import {
  extractCreateVendorImageUpload,
  getVendorCompletenessLabels,
  validateVendorCreateIntent,
} from "../../lib/admin/vendor-create-intent.ts";
import { slugPattern } from "../../lib/validation/common.ts";

const priceBands: PriceBand[] = ["budget", "standard", "premium"];
const dashboardFollowUpPreviewCount = 5;
const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function readText(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();

  return value.length > 0 ? value : undefined;
}

function readNullableText(formData: FormData, key: string): string | null {
  return readText(formData, key) ?? null;
}

function readNumber(formData: FormData, key: string): number {
  return Number(String(formData.get(key) ?? ""));
}

function readPriceBand(formData: FormData, key: string): PriceBand | undefined {
  const value = readText(formData, key);

  return priceBands.includes(value as PriceBand) ? (value as PriceBand) : undefined;
}

function createHoursPayload(
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

function createOnboardingDishesPayload(
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

function createVendorPayload(formData: FormData): CreateVendorRequest {
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    short_description: readNullableText(formData, "short_description"),
    phone_number: readNullableText(formData, "phone_number"),
    address_text: readNullableText(formData, "address_text"),
    city: readNullableText(formData, "city"),
    area: readNullableText(formData, "area"),
    state: readNullableText(formData, "state"),
    country: readNullableText(formData, "country"),
    latitude: readNumber(formData, "latitude"),
    longitude: readNumber(formData, "longitude"),
    price_band: readPriceBand(formData, "price_band") ?? null,
    is_active: true,
    is_open_override: null,
  };
}

function updateVendorPayload(formData: FormData): UpdateVendorRequest {
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

function dishesPayload(formData: FormData): CreateVendorDishesRequest {
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

type AdminVendorFieldErrors = Partial<Record<
  | "name"
  | "slug"
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

type AdminFormProps = {
  selectedVendor: AdminVendorSummary | null;
  vendorHours: VendorHours[];
  vendorImages: VendorImage[];
  vendorDishes: VendorFeaturedDish[];
  disabled: boolean;
  onCreateVendor: (
    data: CreateVendorRequest,
    options?: {
      hoursData: ReplaceVendorHoursRequest | null;
      dishesData: CreateVendorDishesRequest | null;
      imageUpload: FormData | null;
    },
  ) => Promise<void>;
  onUpdateVendor: (data: UpdateVendorRequest) => Promise<void>;
  onDeactivateVendor: () => Promise<void>;
  onReplaceHours: (data: ReplaceVendorHoursRequest) => Promise<void>;
  onCreateImages: (data: FormData) => Promise<VendorImage[] | null>;
  onDeleteImage: (imageId: string) => Promise<void>;
  onCreateDishes: (data: CreateVendorDishesRequest) => Promise<void>;
  onDeleteDish: (dishId: string) => Promise<void>;
};

function formatAdminErrorStatus(error: unknown, fallbackMessage: string): string {
  const visibleError = handleAppError(error, {
    fallbackMessage,
    role: "agent",
    context: "admin_console",
  });
  return visibleError.message;
}

function getAdminStatusTone(status: string, isLoading: boolean): "neutral" | "success" | "error" {
  if (isLoading) {
    return "neutral";
  }

  const normalized = status.toLowerCase();

  if (
    normalized.includes("failed") ||
    normalized.includes("unable") ||
    normalized.includes("error") ||
    normalized.includes("missing") ||
    normalized.includes("forbidden") ||
    normalized.includes("unauthorized")
  ) {
    return "error";
  }

  if (
    normalized.includes("successfully") ||
    normalized.includes("ready") ||
    normalized.includes("refreshed")
  ) {
    return "success";
  }

  return "neutral";
}

function getVendorSummaryStatusLabels(vendor: AdminVendorSummary): string[] {
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

type AdminConsoleProps = {
  initialSelectedVendorId?: string | null;
  mode?: "dashboard" | "agent" | "vendors" | "create" | "edit";
};

export function AdminConsole({
  initialSelectedVendorId = null,
  mode = "dashboard",
}: AdminConsoleProps) {
  const { session, signOut } = useAdminSession();
  const role = session?.adminUser.role ?? "admin";
  const workspaceCacheScope = `role:${role}`;
  const workspaceCacheSnapshot = useMemo(
    () => getVendorWorkspaceSnapshot(workspaceCacheScope),
    [workspaceCacheScope],
  );
  const initialCachedVendorId = initialSelectedVendorId ?? workspaceCacheSnapshot.selectedVendorId;
  const [filters, setFilters] = useState<AdminVendorFilters>(() => workspaceCacheSnapshot.filters);
  const [vendors, setVendors] = useState<AdminVendorSummary[]>(() => workspaceCacheSnapshot.vendors);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(() => initialCachedVendorId);
  const [status, setStatus] = useState("Admin session ready. Load vendors when needed.");
  const [isLoading, setIsLoading] = useState(false);
  const [vendorHours, setVendorHours] = useState<VendorHours[]>(() =>
    initialCachedVendorId
      ? (readVendorArtifactCache(workspaceCacheScope, initialCachedVendorId, "hours") as VendorHours[] | null) ?? []
      : [],
  );
  const [vendorImages, setVendorImages] = useState<VendorImage[]>(() =>
    initialCachedVendorId
      ? (readVendorArtifactCache(workspaceCacheScope, initialCachedVendorId, "images") as VendorImage[] | null) ?? []
      : [],
  );
  const [vendorDishes, setVendorDishes] = useState<VendorFeaturedDish[]>(() =>
    initialCachedVendorId
      ? (readVendorArtifactCache(workspaceCacheScope, initialCachedVendorId, "dishes") as VendorFeaturedDish[] | null) ?? []
      : [],
  );
  const [showAllFollowUpVendors, setShowAllFollowUpVendors] = useState(false);
  const vendorImagesRequestId = useRef(0);
  const vendorHoursRequestId = useRef(0);
  const vendorDishesRequestId = useRef(0);
  const canReadAnalytics = hasAdminPermission(role, "analytics:read");
  const canManageAdminUsers = hasAdminPermission(role, "admin_users:manage");
  const canDeleteVendor = hasAdminPermission(role, "vendor:delete");

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [selectedVendorId, vendors],
  );
  const {
    activeVendorCount,
    vendorsMissingHours,
    vendorsMissingImages,
    vendorsMissingDishes,
    incompleteVendors,
  } = useMemo(() => {
    const active: AdminVendorSummary[] = [];
    const missingHours: AdminVendorSummary[] = [];
    const missingImages: AdminVendorSummary[] = [];
    const missingDishes: AdminVendorSummary[] = [];
    const incomplete: AdminVendorSummary[] = [];

    for (const vendor of vendors) {
      if (vendor.is_active) {
        active.push(vendor);
      }

      const hasMissingHours = vendor.hours_count < 7;
      const hasMissingImages = vendor.images_count < 1;
      const hasMissingDishes = vendor.featured_dishes_count < 1;

      if (hasMissingHours) {
        missingHours.push(vendor);
      }

      if (hasMissingImages) {
        missingImages.push(vendor);
      }

      if (hasMissingDishes) {
        missingDishes.push(vendor);
      }

      if (hasMissingHours || hasMissingImages || hasMissingDishes) {
        incomplete.push(vendor);
      }
    }

    return {
      activeVendorCount: active.length,
      vendorsMissingHours: missingHours,
      vendorsMissingImages: missingImages,
      vendorsMissingDishes: missingDishes,
      incompleteVendors: incomplete,
    };
  }, [vendors]);
  const visibleIncompleteVendors = useMemo(
    () =>
      showAllFollowUpVendors
        ? incompleteVendors
        : incompleteVendors.slice(0, dashboardFollowUpPreviewCount),
    [incompleteVendors, showAllFollowUpVendors],
  );
  const statusTone = getAdminStatusTone(status, isLoading);

  useEffect(() => {
    updateVendorWorkspaceSnapshot(workspaceCacheScope, {
      filters,
      vendors,
      selectedVendorId,
    });
  }, [filters, selectedVendorId, vendors, workspaceCacheScope]);

  const loadVendorImages = useCallback(async function loadVendorImages(
    vendorId: string | null,
    accessToken: string | undefined,
  ) {
    if (!vendorId || !accessToken) {
      setVendorImages([]);
      return;
    }

    const cachedImages = readVendorArtifactCache(workspaceCacheScope, vendorId, "images");

    if (cachedImages) {
      setVendorImages(cachedImages as VendorImage[]);
      return;
    }

    const requestId = ++vendorImagesRequestId.current;
    const images = await listAdminVendorImages(vendorId, {
      accessToken,
    });

    if (requestId === vendorImagesRequestId.current) {
      setVendorImages(images);
      updateVendorArtifactCache(workspaceCacheScope, vendorId, "images", images);
    }
  }, [workspaceCacheScope]);

  const loadVendorHours = useCallback(async function loadVendorHours(
    vendorId: string | null,
    accessToken: string | undefined,
  ) {
    if (!vendorId || !accessToken) {
      setVendorHours([]);
      return;
    }

    const cachedHours = readVendorArtifactCache(workspaceCacheScope, vendorId, "hours");

    if (cachedHours) {
      setVendorHours(cachedHours as VendorHours[]);
      return;
    }

    const requestId = ++vendorHoursRequestId.current;
    const hours = await listAdminVendorHours(vendorId, {
      accessToken,
    });

    if (requestId === vendorHoursRequestId.current) {
      setVendorHours(hours);
      updateVendorArtifactCache(workspaceCacheScope, vendorId, "hours", hours);
    }
  }, [workspaceCacheScope]);

  const loadVendorDishes = useCallback(async function loadVendorDishes(
    vendorId: string | null,
    accessToken: string | undefined,
  ) {
    if (!vendorId || !accessToken) {
      setVendorDishes([]);
      return;
    }

    const cachedDishes = readVendorArtifactCache(workspaceCacheScope, vendorId, "dishes");

    if (cachedDishes) {
      setVendorDishes(cachedDishes as VendorFeaturedDish[]);
      return;
    }

    const requestId = ++vendorDishesRequestId.current;
    const dishes = await listAdminVendorDishes(vendorId, {
      accessToken,
    });

    if (requestId === vendorDishesRequestId.current) {
      setVendorDishes(dishes);
      updateVendorArtifactCache(workspaceCacheScope, vendorId, "dishes", dishes);
    }
  }, [workspaceCacheScope]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadVendorImages(selectedVendor?.id ?? null, session?.accessToken).catch((error) => {
        setVendorImages([]);
        setStatus(error instanceof Error ? error.message : "Unable to load vendor images.");
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadVendorImages, selectedVendor?.id, session?.accessToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadVendorHours(selectedVendor?.id ?? null, session?.accessToken).catch((error) => {
        setVendorHours([]);
        setStatus(formatAdminErrorStatus(error, "Unable to load vendor hours."));
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadVendorHours, selectedVendor?.id, session?.accessToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadVendorDishes(selectedVendor?.id ?? null, session?.accessToken).catch((error) => {
        setVendorDishes([]);
        setStatus(formatAdminErrorStatus(error, "Unable to load vendor dishes."));
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadVendorDishes, selectedVendor?.id, session?.accessToken]);

  const runAdminAction = useCallback(async function runAdminAction<T>(
    action: () => Promise<T>,
    successMessage: string,
    options?: {
      rethrowErrors?: boolean;
    },
  ): Promise<T | null> {
    if (!session?.accessToken) {
      setStatus("Admin session is missing. Sign in again.");
      return null;
    }

    setIsLoading(true);
    setStatus("Working…");

    try {
      const result = await action();
      setStatus(successMessage);
      return result;
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
      ) {
        setStatus(formatAdminErrorStatus(error, "Admin session expired. Sign in again."));
        void signOut();
      } else {
        setStatus(formatAdminErrorStatus(error, "Admin request failed."));
      }

      if (options?.rethrowErrors) {
        throw error;
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, signOut]);

  const applyVendorListResult = useCallback((result: Awaited<ReturnType<typeof listAdminVendors>>) => {
    setVendors(result.vendors);
    setSelectedVendorId((current) => {
      if (current && result.vendors.some((vendor) => vendor.id === current)) {
        return current;
      }

      if (
        initialSelectedVendorId &&
        result.vendors.some((vendor) => vendor.id === initialSelectedVendorId)
      ) {
        return initialSelectedVendorId;
      }

      return result.vendors[0]?.id ?? null;
    });
    updateVendorWorkspaceSnapshot(workspaceCacheScope, {
      filters,
      vendors: result.vendors,
    });
  }, [filters, initialSelectedVendorId, workspaceCacheScope]);

  const refreshVendors = useCallback(async function refreshVendors(nextFilters = filters) {
    const result = await runAdminAction(
      () => listAdminVendors(nextFilters, { accessToken: session?.accessToken ?? "" }),
      "Vendor list refreshed.",
    );

    if (result) {
      applyVendorListResult(result);
    }
  }, [applyVendorListResult, filters, runAdminAction, session?.accessToken]);

  const handleIntakeVendorsUploaded = useCallback(async (
    uploadedVendors: Array<{ id: string; name: string; slug: string }>,
  ) => {
    if (uploadedVendors[0]?.id) {
      setSelectedVendorId(uploadedVendors[0].id);
    }

    await refreshVendors();
  }, [refreshVendors]);

  useEffect(() => {
    if (!session?.accessToken || isLoading || vendors.length > 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refreshVendors();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLoading, refreshVendors, session?.accessToken, vendors.length]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFilters: AdminVendorFilters = {
      limit: filters.limit ?? 100,
      offset: 0,
      search: readText(formData, "search"),
      area: readText(formData, "area"),
      price_band: readPriceBand(formData, "price_band"),
      is_active:
        formData.get("is_active") === "all"
          ? undefined
          : formData.get("is_active") === "true",
    };

    setFilters(nextFilters);
    void refreshVendors(nextFilters);
  }

  async function handleCreateVendor(
    data: CreateVendorRequest,
    options?: {
      hoursData: ReplaceVendorHoursRequest | null;
      dishesData: CreateVendorDishesRequest | null;
      imageUpload: FormData | null;
    },
  ) {
    if (!session?.accessToken) {
      setStatus("Admin session is missing. Sign in again.");
      return;
    }

    setIsLoading(true);
    setStatus("Working…");

    try {
      const createdVendor = await createAdminVendor(data, {
        accessToken: session.accessToken,
      });
      const completionMessages = ["Vendor created successfully."];
      const failures: string[] = [];

      let createdHours: VendorHours[] | null = null;
      let createdDishes: VendorFeaturedDish[] | null = null;
      let createdImages: VendorImage[] | null = null;

      if (options?.hoursData) {
        try {
          createdHours = await replaceAdminVendorHours(createdVendor.id, options.hoursData, {
            accessToken: session.accessToken,
          });
          completionMessages.push("Hours updated successfully.");
        } catch (error) {
          failures.push(`Hours update failed: ${formatAdminErrorStatus(error, "Hours update failed.")}`);
        }
      }

      if (options?.dishesData) {
        try {
          createdDishes = await createAdminVendorDishes(createdVendor.id, options.dishesData, {
            accessToken: session.accessToken,
          });
          completionMessages.push("Featured dishes updated successfully.");
        } catch (error) {
          failures.push(`Featured dishes update failed: ${formatAdminErrorStatus(error, "Featured dishes update failed.")}`);
        }
      }

      if (options?.imageUpload) {
        try {
          createdImages = await createAdminVendorImages(createdVendor.id, options.imageUpload, {
            accessToken: session.accessToken,
          });
          completionMessages.push("Image uploaded successfully.");
        } catch (error) {
          failures.push(`Image upload failed: ${formatAdminErrorStatus(error, "Image upload failed.")}`);
        }
      }

      setSelectedVendorId(createdVendor.id);
      setVendorHours(createdHours ?? []);
      setVendorDishes(createdDishes ?? []);
      setVendorImages(createdImages ?? []);
      updateVendorArtifactCache(workspaceCacheScope, createdVendor.id, "hours", createdHours ?? []);
      updateVendorArtifactCache(workspaceCacheScope, createdVendor.id, "dishes", createdDishes ?? []);
      updateVendorArtifactCache(workspaceCacheScope, createdVendor.id, "images", createdImages ?? []);

      try {
        const refreshed = await listAdminVendors(filters, {
          accessToken: session.accessToken,
        });
        applyVendorListResult(refreshed);
        setSelectedVendorId(createdVendor.id);
      } catch {
        // keep the create flow result visible even if the follow-up list refresh fails
      }

      setStatus(
        failures.length > 0
          ? `${completionMessages.join(" ")} ${failures.join(" ")}`
          : completionMessages.join(" "),
      );
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
      ) {
        setStatus(formatAdminErrorStatus(error, "Admin session expired. Sign in again."));
        void signOut();
      } else {
        setStatus(formatAdminErrorStatus(error, "Vendor creation failed."));
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateVendor(data: UpdateVendorRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before updating.");
      return;
    }

    const updatedVendor = await runAdminAction(
      () => updateAdminVendor(selectedVendor.id, data, { accessToken: session?.accessToken ?? "" }),
      "Vendor updated successfully.",
      { rethrowErrors: true },
    );

    if (updatedVendor) {
      await refreshVendors();
    }
  }

  async function handleDeactivateVendor() {
    if (!selectedVendor) {
      setStatus("Select a vendor before deactivating.");
      return;
    }

    const deactivatedVendor = await runAdminAction(
      () => deactivateAdminVendor(selectedVendor.id, { accessToken: session?.accessToken ?? "" }),
      "Vendor deactivated successfully.",
    );

    if (deactivatedVendor) {
      await refreshVendors();
    }
  }

  async function handleReplaceHours(data: ReplaceVendorHoursRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before replacing hours.");
      return;
    }

    const hours = await runAdminAction(
      () =>
        replaceAdminVendorHours(selectedVendor.id, data, {
          accessToken: session?.accessToken ?? "",
        }),
      "Hours updated successfully.",
    );

    if (hours && selectedVendor) {
      setVendorHours(hours);
      updateVendorArtifactCache(workspaceCacheScope, selectedVendor.id, "hours", hours);
    }
  }

  async function handleCreateImages(data: FormData): Promise<VendorImage[] | null> {
    if (!selectedVendor) {
      setStatus("Select a vendor before adding images.");
      return null;
    }

    const uploadedImages = await runAdminAction(
      () =>
        createAdminVendorImages(selectedVendor.id, data, {
          accessToken: session?.accessToken ?? "",
        }),
      "Image uploaded successfully.",
    );

    if (uploadedImages && selectedVendor) {
      setVendorImages((current) =>
        [...current, ...uploadedImages].toSorted(
          (left, right) => left.sort_order - right.sort_order,
        ),
      );
      updateVendorArtifactCache(
        workspaceCacheScope,
        selectedVendor.id,
        "images",
        [...vendorImages, ...uploadedImages].toSorted(
          (left, right) => left.sort_order - right.sort_order,
        ),
      );
    }

    return uploadedImages;
  }

  async function handleDeleteImage(imageId: string) {
    if (!selectedVendor) {
      setStatus("Select a vendor before removing images.");
      return;
    }

    const deletedImage = await runAdminAction(
      () =>
        deleteAdminVendorImage(selectedVendor.id, imageId, {
          accessToken: session?.accessToken ?? "",
        }),
      "Image removed successfully.",
    );

    if (deletedImage && selectedVendor) {
      const nextImages = vendorImages.filter((image) => image.id !== deletedImage.id);
      setVendorImages(nextImages);
      updateVendorArtifactCache(workspaceCacheScope, selectedVendor.id, "images", nextImages);
    }
  }

  async function handleCreateDishes(data: CreateVendorDishesRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before adding dishes.");
      return;
    }

    const dishes = await runAdminAction(
      () =>
        createAdminVendorDishes(selectedVendor.id, data, {
          accessToken: session?.accessToken ?? "",
        }),
      "Featured dishes updated successfully.",
    );

    if (dishes && selectedVendor) {
      const nextDishes = [...vendorDishes, ...dishes];
      setVendorDishes(nextDishes);
      updateVendorArtifactCache(workspaceCacheScope, selectedVendor.id, "dishes", nextDishes);
    }
  }

  async function handleDeleteDish(dishId: string) {
    if (!selectedVendor) {
      setStatus("Select a vendor before removing dishes.");
      return;
    }

    const deletedDish = await runAdminAction(
      () =>
        deleteAdminVendorDish(selectedVendor.id, dishId, {
          accessToken: session?.accessToken ?? "",
        }),
      "Featured dish removed successfully.",
    );

    if (deletedDish && selectedVendor) {
      const nextDishes = vendorDishes.filter((dish) => dish.id !== deletedDish.id);
      setVendorDishes(nextDishes);
      updateVendorArtifactCache(workspaceCacheScope, selectedVendor.id, "dishes", nextDishes);
    }
  }

  return (
    <div className={`admin-console admin-console-${mode}`}>
      <section className={`admin-panel admin-status-panel admin-status-panel-${statusTone}`} aria-live="polite">
        <div className="admin-status-heading">
          <p className="eyebrow">Status</p>
          <h2>{isLoading ? "Working" : "Ready"}</h2>
        </div>
        <p className="admin-status-copy">{status}</p>
        <div className="action-row">
          <button
            className="button-secondary"
            disabled={isLoading}
            type="button"
            onClick={() => void refreshVendors()}
          >
            Refresh vendors
          </button>
          <button className="button-secondary" type="button" onClick={() => void signOut()}>
            Log out
          </button>
        </div>
      </section>

      {mode === "dashboard" ? (
        <>
          <section className="admin-overview-grid" aria-label="Admin overview">
            <article className="admin-metric-panel">
              <span>Loaded vendors</span>
              <strong>{vendors.length}</strong>
              <small>Current registry set</small>
            </article>
            <article className="admin-metric-panel">
              <span>Loaded active vendors</span>
              <strong>{activeVendorCount}</strong>
              <small>Available to users</small>
            </article>
            <article className="admin-metric-panel">
              <span>Missing hours</span>
              <strong>{vendorsMissingHours.length}</strong>
              <small>Need schedule completion</small>
            </article>
            <article className="admin-metric-panel">
              <span>Missing images</span>
              <strong>{vendorsMissingImages.length}</strong>
              <small>Need profile media</small>
            </article>
            <article className="admin-metric-panel">
              <span>Missing dishes</span>
              <strong>{vendorsMissingDishes.length}</strong>
              <small>Need menu highlights</small>
            </article>
          </section>

          <section className="admin-grid admin-grid-dashboard">
            <div className="admin-stack">
              <section className="admin-panel" aria-labelledby="admin-dashboard-actions">
                <div className="admin-section-header">
                  <div>
                    <p className="eyebrow">Quick actions</p>
                    <h2 id="admin-dashboard-actions">Next actions</h2>
                  </div>
                </div>
                <div className="admin-action-cards">
                  <Link className="admin-action-card" href="/admin/vendors/new">
                    <strong>Create vendor</strong>
                    <span>Add a new vendor record and acknowledge any missing data intentionally.</span>
                  </Link>
                  <Link className="admin-action-card" href="/admin/vendors">
                    <strong>Manage vendors</strong>
                    <span>Search the registry, inspect completeness, and open edit workspaces.</span>
                  </Link>
                  <Link className="admin-action-card" href="/admin/vendors">
                    <strong>Review incomplete vendors</strong>
                    <span>Focus on vendors still missing hours, images, or featured dishes.</span>
                  </Link>
                  {canReadAnalytics ? (
                    <Link className="admin-action-card" href="/admin/analytics">
                      <strong>Review analytics</strong>
                      <span>Inspect usage signals, drop-off, and vendor engagement.</span>
                    </Link>
                  ) : null}
                  {canManageAdminUsers ? (
                    <Link className="admin-action-card" href="/admin/team">
                      <strong>Manage team access</strong>
                      <span>Create admin or agent accounts and keep roles explicit.</span>
                    </Link>
                  ) : null}
                </div>
              </section>

              <section className="admin-panel" aria-labelledby="admin-dashboard-role">
                <div className="admin-section-header">
                  <div>
                    <p className="eyebrow">Current role</p>
                    <h2 id="admin-dashboard-role">{getAdminRoleLabel(role)}</h2>
                  </div>
                </div>
                <p className="form-note">
                  {role === "admin"
                    ? "Full access: vendor operations, analytics, and team access management."
                    : "Restricted access: vendor creation and editing only. Analytics and team access are hidden and blocked server-side."}
                </p>
              </section>
            </div>

            <section className="admin-panel" aria-labelledby="admin-dashboard-incomplete">
              <div className="admin-section-header">
                <div>
                  <p className="eyebrow">Incomplete vendors</p>
                  <h2 id="admin-dashboard-incomplete">Needs follow-up</h2>
                </div>
                <span>{incompleteVendors.length} vendors</span>
              </div>
              <VendorRegistryList
                vendors={visibleIncompleteVendors}
                selectedVendorId={selectedVendorId}
                onSelectVendor={setSelectedVendorId}
                emptyMessage="All loaded vendors have hours, images, and featured dishes."
                compact
              />
              {incompleteVendors.length > dashboardFollowUpPreviewCount ? (
                <div className="admin-list-toggle-row">
                  <button
                    className="button-secondary"
                    type="button"
                    aria-expanded={showAllFollowUpVendors}
                    onClick={() => {
                      setShowAllFollowUpVendors((current) => !current);
                    }}
                  >
                    {showAllFollowUpVendors ? "Read less" : "Read more"}
                  </button>
                  <span>
                    Showing {visibleIncompleteVendors.length} of {incompleteVendors.length}
                  </span>
                </div>
              ) : null}
            </section>
          </section>
        </>
      ) : null}

      {mode === "agent" ? (
        <section className="admin-grid admin-grid-dashboard">
          <AgentQuickAddPanel
            accessToken={session?.accessToken}
            disabled={isLoading}
            onVendorsUploaded={handleIntakeVendorsUploaded}
          />

          <section className="admin-panel" aria-labelledby="agent-dashboard-actions">
            <div className="admin-section-header">
              <div>
                <p className="eyebrow">Quick actions</p>
                <h2 id="agent-dashboard-actions">Vendor tasks</h2>
              </div>
            </div>
            <div className="admin-action-cards">
              <Link className="admin-action-card" href="/admin/vendors/new">
                <strong>Create vendor</strong>
                <span>Add a new vendor record and capture the required identity fields.</span>
              </Link>
              <Link className="admin-action-card" href="/admin/vendors">
                <strong>Manage vendors</strong>
                <span>Search the registry, inspect completeness, and open edit workspaces.</span>
              </Link>
              <Link className="admin-action-card" href="/admin/vendors">
                <strong>Review incomplete vendors</strong>
                <span>Focus on vendors still missing hours, images, or featured dishes.</span>
              </Link>
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="agent-dashboard-vendors">
            <div className="admin-section-header">
              <div>
                <p className="eyebrow">Vendor registry</p>
                <h2 id="agent-dashboard-vendors">Loaded vendors</h2>
              </div>
              <span>{vendors.length} vendors</span>
            </div>
            <VendorRegistryList
              vendors={vendors}
              selectedVendorId={selectedVendorId}
              onSelectVendor={setSelectedVendorId}
              emptyMessage="No vendors are loaded yet. Refresh or create a vendor to begin."
              compact
            />
          </section>

          <section className="admin-panel" aria-labelledby="agent-dashboard-selection">
            <div className="admin-section-header">
              <div>
                <p className="eyebrow">Selection</p>
                <h2 id="agent-dashboard-selection">
                  {selectedVendor ? selectedVendor.name : "Select a vendor"}
                </h2>
              </div>
            </div>
            <p className="form-note">
              Review completeness and continue into the edit workspace for this vendor.
            </p>
            {selectedVendor ? (
              <>
                <ul className="admin-completeness-list">
                  {getVendorSummaryStatusLabels(selectedVendor).map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
                <div className="admin-selection-actions">
                  <Link className="button-primary" href={`/admin/vendors/${selectedVendor.id}`}>
                    Open edit workspace
                  </Link>
                </div>
              </>
            ) : (
              <p className="empty-state">Select a vendor to continue editing.</p>
            )}
          </section>

          <VendorCsvUploadPanel
            accessToken={session?.accessToken}
            disabled={isLoading}
            onVendorsUploaded={handleIntakeVendorsUploaded}
          />
        </section>
      ) : null}

      {mode === "vendors" ? (
        <section className="admin-grid admin-grid-vendors">
          <VendorRegistryPanel
            disabled={isLoading}
            filters={filters}
            selectedVendorId={selectedVendorId}
            vendors={vendors}
            onSelectVendor={setSelectedVendorId}
            onSubmitFilters={submitFilters}
          />
          <section className="admin-panel" aria-labelledby="vendor-list-preview">
            <p className="eyebrow">Selection</p>
            <h2 id="vendor-list-preview">
              {selectedVendor ? selectedVendor.name : "Select a vendor"}
            </h2>
            <p className="form-note">
              Review completeness and open a dedicated edit workspace for this vendor.
            </p>
            {selectedVendor ? (
              <>
                <ul className="admin-completeness-list">
                  {getVendorSummaryStatusLabels(selectedVendor).map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
                <dl className="admin-summary-grid">
                  <div>
                    <dt>Area</dt>
                    <dd>{selectedVendor.area ?? "Area missing"}</dd>
                  </div>
                  <div>
                    <dt>Hours rows</dt>
                    <dd>{selectedVendor.hours_count}</dd>
                  </div>
                  <div>
                    <dt>Images</dt>
                    <dd>{selectedVendor.images_count}</dd>
                  </div>
                  <div>
                    <dt>Featured dishes</dt>
                    <dd>{selectedVendor.featured_dishes_count}</dd>
                  </div>
                </dl>
                <div className="admin-selection-actions">
                  <Link className="button-primary" href={`/admin/vendors/${selectedVendor.id}`}>
                    Open edit workspace
                  </Link>
                </div>
              </>
            ) : (
              <p className="empty-state">Select a vendor to review details and edit it.</p>
            )}
          </section>
        </section>
      ) : null}

      {mode === "create" ? (
        <section className="admin-grid admin-grid-create">
          <AdminCreateVendorSection
            disabled={isLoading}
            onCreateVendor={handleCreateVendor}
          />
          <VendorCsvUploadPanel
            accessToken={session?.accessToken}
            disabled={isLoading}
            onVendorsUploaded={handleIntakeVendorsUploaded}
          />
          <section className="admin-panel" aria-labelledby="create-vendor-guidance">
            <p className="eyebrow">Workflow</p>
            <h2 id="create-vendor-guidance">Create flow</h2>
            <ul className="admin-guidance-list">
              <li>Basic vendor identity is created first.</li>
              <li>Hours, images, and featured dishes can be added immediately after creation.</li>
              <li>Missing-data acknowledgements prevent accidental incomplete records.</li>
              <li>Uploaded vendor images appear on the public vendor profile, not on dish cards.</li>
            </ul>
          </section>
        </section>
      ) : null}

      {mode === "edit" ? (
        <section className="admin-grid admin-grid-edit">
          <VendorRegistryPanel
            disabled={isLoading}
            filters={filters}
            selectedVendorId={selectedVendorId}
            vendors={vendors}
            onSelectVendor={setSelectedVendorId}
            onSubmitFilters={submitFilters}
          />
          <EditVendorWorkspace
            canDeleteVendor={canDeleteVendor}
            disabled={isLoading}
            selectedVendor={selectedVendor}
            vendorDishes={vendorDishes}
            vendorHours={vendorHours}
            vendorImages={vendorImages}
            onUpdateVendor={handleUpdateVendor}
            onDeactivateVendor={handleDeactivateVendor}
            onReplaceHours={handleReplaceHours}
            onCreateImages={handleCreateImages}
            onDeleteImage={handleDeleteImage}
            onCreateDishes={handleCreateDishes}
            onDeleteDish={handleDeleteDish}
          />
        </section>
      ) : null}
    </div>
  );
}

const VendorRegistryPanel = memo(function VendorRegistryPanel({
  disabled,
  filters,
  selectedVendorId,
  vendors,
  onSelectVendor,
  onSubmitFilters,
}: {
  disabled: boolean;
  filters: AdminVendorFilters;
  selectedVendorId: string | null;
  vendors: AdminVendorSummary[];
  onSelectVendor: (vendorId: string) => void;
  onSubmitFilters: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="admin-panel admin-registry-panel" aria-labelledby="vendor-registry">
      <div className="admin-section-header">
        <div>
          <p className="eyebrow">Vendor registry</p>
          <h2 id="vendor-registry">Manage vendors</h2>
        </div>
        <span>{vendors.length} loaded</span>
      </div>

      <form className="admin-form" onSubmit={onSubmitFilters}>
        <div className="admin-filter-grid">
          <label className="field field-wide">
            <span>Search</span>
            <input defaultValue={filters.search ?? ""} name="search" placeholder="Vendor name, area, or cue" />
          </label>
          <label className="field">
            <span>Area</span>
            <input defaultValue={filters.area ?? ""} name="area" placeholder="Wuse" />
          </label>
          <label className="field">
            <span>Price band</span>
            <select defaultValue={filters.price_band ?? ""} name="price_band">
              <option value="">All</option>
              {priceBands.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select defaultValue={filters.is_active === undefined ? "all" : String(filters.is_active)} name="is_active">
              <option value="all">All vendors</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </label>
        </div>
        <div className="action-row">
          <button className="button-primary" disabled={disabled} type="submit">
            Apply
          </button>
        </div>
      </form>

      <VendorRegistryList
        vendors={vendors}
        selectedVendorId={selectedVendorId}
        onSelectVendor={onSelectVendor}
        emptyMessage="No vendors matched the current filters."
      />
    </section>
  );
});

const VendorRegistryList = memo(function VendorRegistryList({
  vendors,
  selectedVendorId,
  onSelectVendor,
  emptyMessage,
  compact = false,
}: {
  vendors: AdminVendorSummary[];
  selectedVendorId: string | null;
  onSelectVendor: (vendorId: string) => void;
  emptyMessage: string;
  compact?: boolean;
}) {
  if (vendors.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className={compact ? "admin-list admin-list-compact" : "admin-list"}>
      {vendors.map((vendor) => {
        const labels = getVendorSummaryStatusLabels(vendor);

        return (
          <li key={vendor.id}>
            <button
              className={selectedVendorId === vendor.id ? "admin-list-item selected" : "admin-list-item"}
              type="button"
              onClick={() => onSelectVendor(vendor.id)}
            >
              <div className="admin-list-item-copy">
                <div className="admin-list-item-topline">
                  <strong>{vendor.name}</strong>
                  <span className="admin-list-item-edit">Review</span>
                </div>
                <span>{vendor.area ?? "Area missing"}</span>
              </div>
              <div className="admin-list-badges" aria-label={`${vendor.name} status`}>
                {labels.map((label) => (
                  <span className="admin-badge" key={label}>
                    {label}
                  </span>
                ))}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
});

function AdminCreateVendorSection({
  disabled,
  onCreateVendor,
}: {
  disabled: boolean;
  onCreateVendor: (
    data: CreateVendorRequest,
    options?: {
      hoursData: ReplaceVendorHoursRequest | null;
      dishesData: CreateVendorDishesRequest | null;
      imageUpload: FormData | null;
    },
  ) => Promise<void>;
}) {
  const [createFieldErrors, setCreateFieldErrors] = useState<AdminVendorFieldErrors>({});
  const [createIntentErrors, setCreateIntentErrors] = useState<Partial<Record<
    "hours" | "featured_dishes" | "images",
  string
  >>>({});
  const [pendingCreateVendorImagePreviewUrl, setPendingCreateVendorImagePreviewUrl] = useState<string | null>(null);
  const [pendingCreateVendorImageName, setPendingCreateVendorImageName] = useState<string | null>(null);
  const [hoursDraft, setHoursDraft] = useState(
    dayLabels.map(() => ({
      open: "",
      close: "",
      closed: false,
    })),
  );
  const [dishRows, setDishRows] = useState([
    { id: 0, dish_name: "", description: "", image_url: "" },
  ]);
  const [createSummary, setCreateSummary] = useState({
    name: "",
    area: "",
    missingHoursAcknowledged: false,
    missingFeaturedDishesAcknowledged: false,
    missingImagesAcknowledged: false,
  });

  useEffect(() => {
    return () => {
      if (pendingCreateVendorImagePreviewUrl) {
        URL.revokeObjectURL(pendingCreateVendorImagePreviewUrl);
      }
    };
  }, [pendingCreateVendorImagePreviewUrl]);

  async function submitCreateVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateFieldErrors({});
    setCreateIntentErrors({});
    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    const intentErrors = validateVendorCreateIntent(formData);

    if (Object.keys(intentErrors).length > 0) {
      setCreateIntentErrors(intentErrors);
      return;
    }

    try {
      const hoursData = hoursDraft.some(
        (hours) => hours.closed || hours.open.trim().length > 0 || hours.close.trim().length > 0,
      )
        ? createHoursPayload(formData, "create-")
        : null;
      const dishesData = createOnboardingDishesPayload(
        formData,
        dishRows.map((dish) => dish.id),
      );

      await onCreateVendor(createVendorPayload(formData), {
        hoursData,
        dishesData,
        imageUpload: extractCreateVendorImageUpload(formData),
      });
      setHoursDraft(
        dayLabels.map(() => ({
          open: "",
          close: "",
          closed: false,
        })),
      );
      setDishRows([{ id: 0, dish_name: "", description: "", image_url: "" }]);
      setCreateSummary({
        name: "",
        area: "",
        missingHoursAcknowledged: false,
        missingFeaturedDishesAcknowledged: false,
        missingImagesAcknowledged: false,
      });
      setPendingCreateVendorImageName(null);
      setPendingCreateVendorImagePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
      form?.reset();
    } catch (error) {
      if (error instanceof AdminApiError && error.code === "VALIDATION_ERROR") {
        const feedback = extractValidationFeedback(error.details);
        setCreateFieldErrors(feedback.fieldErrors as AdminVendorFieldErrors);
        return;
      }

      if (error instanceof Error) {
        setCreateIntentErrors((current) => ({
          ...current,
          hours: error.message.includes("Use format like") ? error.message : current.hours,
        }));
      }
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="create-vendor">
      <p className="eyebrow">Create vendor</p>
      <h2 id="create-vendor">New vendor</h2>
      <p className="form-note">Add the vendor&apos;s basic details, hours, featured dishes, and images.</p>
      <form className="admin-form" onSubmit={submitCreateVendor}>
        <section className="admin-subsection admin-create-section-card" aria-labelledby="create-basic-details">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Section 1</p>
              <h3 id="create-basic-details">Basic details</h3>
            </div>
          </div>
          <CreateVendorIdentityFields
            fieldErrors={createFieldErrors}
            onAreaChange={(value) =>
              setCreateSummary((current) => ({
                ...current,
                area: value,
              }))
            }
            onNameChange={(value) =>
              setCreateSummary((current) => ({
                ...current,
                name: value,
              }))
            }
          />
        </section>

        <section className="admin-subsection admin-create-section-card" aria-labelledby="create-hours">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Section 2</p>
              <h3 id="create-hours">Opening hours</h3>
            </div>
          </div>
          <div className="hours-grid">
            {dayLabels.map((day, index) => (
              <div className="hours-row" key={day}>
                <strong>{day}</strong>
                <label className="field">
                  <span>Opens</span>
                  <input
                    name={`create-open-${index}`}
                    placeholder="9 AM"
                    value={hoursDraft[index]?.open ?? ""}
                    onChange={(event) => {
                      const next = [...hoursDraft];
                      next[index] = { ...next[index], open: event.target.value };
                      setHoursDraft(next);
                    }}
                  />
                </label>
                <label className="field">
                  <span>Closes</span>
                  <input
                    name={`create-close-${index}`}
                    placeholder="8:30 PM"
                    value={hoursDraft[index]?.close ?? ""}
                    onChange={(event) => {
                      const next = [...hoursDraft];
                      next[index] = { ...next[index], close: event.target.value };
                      setHoursDraft(next);
                    }}
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    checked={hoursDraft[index]?.closed ?? false}
                    name={`create-closed-${index}`}
                    type="checkbox"
                    onChange={(event) => {
                      const next = [...hoursDraft];
                      next[index] = { ...next[index], closed: event.target.checked };
                      setHoursDraft(next);
                    }}
                  />
                  <span>Closed</span>
                </label>
              </div>
            ))}
          </div>
          <span className="field-hint">Use format like 9 AM or 8:30 PM.</span>
          <label className="checkbox-field">
            <input
              checked={createSummary.missingHoursAcknowledged}
              name="missing-hours-acknowledged"
              type="checkbox"
              onChange={(event) =>
                setCreateSummary((current) => ({
                  ...current,
                  missingHoursAcknowledged: event.target.checked,
                }))
              }
            />
            <span>I do not have this vendor&apos;s opening hours yet.</span>
          </label>
          {createIntentErrors.hours ? <span className="field-error">{createIntentErrors.hours}</span> : null}
        </section>

        <section className="admin-subsection admin-create-section-card" aria-labelledby="create-dishes">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Section 3</p>
              <h3 id="create-dishes">Featured dishes</h3>
            </div>
            <span>{dishRows.filter((dish) => dish.dish_name.trim().length > 0).length} ready</span>
          </div>
          <div className="admin-create-dishes-stack">
            {dishRows.map((dish, index) => (
              <div className="admin-inline-list-item admin-create-dish-card" key={dish.id}>
                <div className="admin-create-dish-card-header">
                  <strong>Dish {index + 1}</strong>
                  {dishRows.length > 1 ? (
                    <button
                      className="button-secondary compact-button"
                      type="button"
                      onClick={() => setDishRows((current) => current.filter((item) => item.id !== dish.id))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="admin-form">
                  <label className="field field-wide">
                    <span>Dish name</span>
                    <input
                      name={`create-dish-name-${dish.id}`}
                      placeholder="Jollof rice"
                      value={dish.dish_name}
                      onChange={(event) =>
                        setDishRows((current) =>
                          current.map((item) =>
                            item.id === dish.id ? { ...item, dish_name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field field-wide">
                    <span>Description</span>
                    <input
                      name={`create-dish-description-${dish.id}`}
                      placeholder="Short description"
                      value={dish.description}
                      onChange={(event) =>
                        setDishRows((current) =>
                          current.map((item) =>
                            item.id === dish.id ? { ...item, description: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field field-wide">
                    <span>Optional dish image URL</span>
                    <input
                      name={`create-dish-image-url-${dish.id}`}
                      placeholder="https://..."
                      value={dish.image_url}
                      onChange={(event) =>
                        setDishRows((current) =>
                          current.map((item) =>
                            item.id === dish.id ? { ...item, image_url: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="action-row">
            <button
              className="button-secondary"
              disabled={dishRows.length >= 3}
              type="button"
              onClick={() =>
                setDishRows((current) => [
                  ...current,
                  {
                    id: current.reduce((maxId, item) => Math.max(maxId, item.id), -1) + 1,
                    dish_name: "",
                    description: "",
                    image_url: "",
                  },
                ])
              }
            >
              Add another dish
            </button>
          </div>
          <label className="checkbox-field">
            <input
              checked={createSummary.missingFeaturedDishesAcknowledged}
              name="missing-featured-dishes-acknowledged"
              type="checkbox"
              onChange={(event) =>
                setCreateSummary((current) => ({
                  ...current,
                  missingFeaturedDishesAcknowledged: event.target.checked,
                }))
              }
            />
            <span>I do not have featured dishes yet.</span>
          </label>
          {createIntentErrors.featured_dishes ? (
            <span className="field-error">{createIntentErrors.featured_dishes}</span>
          ) : null}
        </section>

        <section className="admin-subsection admin-create-section-card" aria-labelledby="create-images">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Section 4</p>
              <h3 id="create-images">Vendor images</h3>
            </div>
          </div>
          <p className="form-note">Vendor images appear on the public vendor profile.</p>
          <label className="field field-wide">
            <span>Vendor profile image</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              name="create-image"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;

                setPendingCreateVendorImagePreviewUrl((current) => {
                  if (current) {
                    URL.revokeObjectURL(current);
                  }

                  return file ? URL.createObjectURL(file) : null;
                });
                setPendingCreateVendorImageName(file?.name ?? null);
              }}
            />
          </label>
          <label className="field">
            <span>Image sort order</span>
            <input defaultValue="0" min="0" name="create-image-sort-order" type="number" />
          </label>
          {pendingCreateVendorImagePreviewUrl ? (
            <div className="vendor-image-local-preview">
              <div className="vendor-image-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" loading="lazy" src={pendingCreateVendorImagePreviewUrl} />
              </div>
              <span>{pendingCreateVendorImageName ?? "Selected image preview"}</span>
            </div>
          ) : null}
          <label className="checkbox-field">
            <input
              checked={createSummary.missingImagesAcknowledged}
              name="missing-images-acknowledged"
              type="checkbox"
              onChange={(event) =>
                setCreateSummary((current) => ({
                  ...current,
                  missingImagesAcknowledged: event.target.checked,
                }))
              }
            />
            <span>I do not have vendor images yet.</span>
          </label>
          {createIntentErrors.images ? <span className="field-error">{createIntentErrors.images}</span> : null}
        </section>

        <section className="admin-subsection admin-create-section-card" aria-labelledby="create-review">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Section 5</p>
              <h3 id="create-review">Review and create</h3>
            </div>
          </div>
          <dl className="admin-summary-grid">
            <div>
              <dt>Vendor name</dt>
              <dd>{createSummary.name || "Not filled yet"}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{createSummary.area || "Not filled yet"}</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>
                {hoursDraft.some((hours) => hours.closed || hours.open.trim().length > 0 || hours.close.trim().length > 0)
                  ? `${hoursDraft.filter((hours) => hours.closed || hours.open.trim().length > 0 || hours.close.trim().length > 0).length} days ready`
                  : createSummary.missingHoursAcknowledged
                    ? "Will add later"
                    : "Missing"}
              </dd>
            </div>
            <div>
              <dt>Featured dishes</dt>
              <dd>
                {dishRows.filter((dish) => dish.dish_name.trim().length > 0).length > 0
                  ? `${dishRows.filter((dish) => dish.dish_name.trim().length > 0).length} added`
                  : createSummary.missingFeaturedDishesAcknowledged
                    ? "Will add later"
                    : "Missing"}
              </dd>
            </div>
            <div>
              <dt>Image</dt>
              <dd>
                {pendingCreateVendorImageName
                  ? pendingCreateVendorImageName
                  : createSummary.missingImagesAcknowledged
                    ? "Will add later"
                    : "Missing"}
              </dd>
            </div>
            <div>
              <dt>Acknowledgements</dt>
              <dd>
                {[
                  createSummary.missingHoursAcknowledged ? "Hours later" : null,
                  createSummary.missingFeaturedDishesAcknowledged ? "Dishes later" : null,
                  createSummary.missingImagesAcknowledged ? "Images later" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </dd>
            </div>
          </dl>
        </section>
        <button className="button-primary" disabled={disabled} type="submit">
          Create vendor
        </button>
      </form>
    </section>
  );
}

function EditVendorWorkspace({
  canDeleteVendor,
  disabled,
  selectedVendor,
  vendorHours,
  vendorImages,
  vendorDishes,
  onUpdateVendor,
  onDeactivateVendor,
  onReplaceHours,
  onCreateImages,
  onDeleteImage,
  onCreateDishes,
  onDeleteDish,
}: Omit<AdminFormProps, "onCreateVendor"> & {
  canDeleteVendor: boolean;
}) {
  const completenessLabels = useMemo(
    () =>
      getVendorCompletenessLabels({
        hours: vendorHours,
        images: vendorImages,
        dishes: vendorDishes,
      }),
    [vendorDishes, vendorHours, vendorImages],
  );

  if (!selectedVendor) {
    return (
      <section className="admin-panel" aria-labelledby="edit-vendor-empty">
        <p className="eyebrow">Edit workspace</p>
        <h2 id="edit-vendor-empty">Select a vendor</h2>
        <p className="empty-state">
          Choose a vendor from the registry to open details, hours, featured dishes, and images.
        </p>
      </section>
    );
  }

  return (
    <section className="admin-stack">
      <section className="admin-panel admin-identity-panel" aria-labelledby="edit-vendor-identity">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Edit workspace</p>
            <h2 id="edit-vendor-identity">{selectedVendor.name}</h2>
          </div>
          <span>{selectedVendor.slug}</span>
        </div>
        <dl className="admin-summary-grid">
          <div>
            <dt>Area</dt>
            <dd>{selectedVendor.area ?? "Area missing"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{selectedVendor.phone_number ?? "Phone missing"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{selectedVendor.is_active ? "Active" : "Inactive"}</dd>
          </div>
          <div>
            <dt>Public page</dt>
            <dd>/vendors/{selectedVendor.slug}</dd>
          </div>
        </dl>
        {completenessLabels.length > 0 ? (
          <ul className="admin-completeness-list">
            {completenessLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <p className="form-note">This vendor currently has hours, images, and featured dishes.</p>
        )}
        <nav className="admin-section-tabs" aria-label="Vendor edit sections">
          <a href="#edit-basic-details">Basic details</a>
          <a href="#edit-hours">Hours</a>
          <a href="#edit-dishes">Featured dishes</a>
          <a href="#edit-images">Images</a>
        </nav>
      </section>

      <div className="admin-edit-sections">
        <div id="edit-basic-details">
          <UpdateVendorSection
            canDeleteVendor={canDeleteVendor}
            disabled={disabled}
            onDeactivateVendor={onDeactivateVendor}
            onUpdateVendor={onUpdateVendor}
            selectedVendor={selectedVendor}
            completenessLabels={completenessLabels}
          />
        </div>
        <div id="edit-hours">
          <VendorHoursSection
            key={`${selectedVendor.id}:${vendorHours
              .map(
                (hours) =>
                  `${hours.day_of_week}:${hours.open_time ?? "closed"}:${hours.close_time ?? "closed"}:${hours.is_closed}`,
              )
              .join("|")}`}
            disabled={disabled}
            selectedVendor={selectedVendor}
            vendorHours={vendorHours}
            onReplaceHours={onReplaceHours}
          />
        </div>
        <div className="admin-edit-split">
          <div id="edit-dishes">
            <FeaturedDishesSection
              disabled={disabled}
              selectedVendor={selectedVendor}
              vendorDishes={vendorDishes}
              onCreateDishes={onCreateDishes}
              onDeleteDish={onDeleteDish}
            />
          </div>
          <div id="edit-images">
            <VendorImagesSection
              disabled={disabled}
              selectedVendor={selectedVendor}
              vendorImages={vendorImages}
              onCreateImages={onCreateImages}
              onDeleteImage={onDeleteImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function VendorImagesSection({
  disabled,
  selectedVendor,
  vendorImages,
  onCreateImages,
  onDeleteImage,
}: {
  disabled: boolean;
  selectedVendor: AdminVendorSummary | null;
  vendorImages: VendorImage[];
  onCreateImages: (data: FormData) => Promise<VendorImage[] | null>;
  onDeleteImage: (imageId: string) => Promise<void>;
}) {
  const [pendingVendorImagePreviewUrl, setPendingVendorImagePreviewUrl] = useState<string | null>(null);
  const [pendingVendorImageName, setPendingVendorImageName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pendingVendorImagePreviewUrl) {
        URL.revokeObjectURL(pendingVendorImagePreviewUrl);
      }
    };
  }, [pendingVendorImagePreviewUrl]);

  return (
    <section className="admin-panel" aria-labelledby="vendor-images">
      <p className="eyebrow">Vendor profile images</p>
      <h2 id="vendor-images">Vendor images</h2>
      <p className="form-note">
        These images appear on the vendor public profile. They are different from optional featured dish image URLs.
      </p>
      <form
        className="admin-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;

          if (!form.reportValidity()) {
            return;
          }

          const uploadedImages = await onCreateImages(new FormData(form));

          if (uploadedImages) {
            setPendingVendorImageName(null);
            setPendingVendorImagePreviewUrl((current) => {
              if (current) {
                URL.revokeObjectURL(current);
              }

              return null;
            });
            form?.reset();
          }
        }}
      >
        <label className="field field-wide">
          <span>
            Image file <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input
            accept="image/jpeg,image/png,image/webp"
            name="image"
            required
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;

              setPendingVendorImagePreviewUrl((current) => {
                if (current) {
                  URL.revokeObjectURL(current);
                }

                return file ? URL.createObjectURL(file) : null;
              });
              setPendingVendorImageName(file?.name ?? null);
            }}
          />
        </label>
        <label className="field">
          <span>Sort order</span>
          <input defaultValue="0" name="sort_order" min="0" type="number" />
        </label>
        {pendingVendorImagePreviewUrl ? (
          <div className="vendor-image-local-preview">
            <div className="vendor-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" loading="lazy" src={pendingVendorImagePreviewUrl} />
            </div>
            <span>{pendingVendorImageName ?? "Selected image preview"}</span>
          </div>
        ) : null}
        <button className="button-secondary" disabled={disabled || !selectedVendor} type="submit">
          Upload vendor image
        </button>
      </form>

      <div className="admin-subsection">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Current</p>
            <h2>Current vendor images</h2>
          </div>
          <span>{vendorImages.length} images</span>
        </div>
        <ul className="vendor-image-list">
          {vendorImages.map((image) => (
            <li className="vendor-image-item" key={image.id}>
              <div className="vendor-image-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" loading="lazy" src={image.image_url} />
              </div>
              <div className="vendor-image-meta">
                <strong>Image {image.sort_order + 1}</strong>
                <span>{image.storage_object_path ?? "External image URL"}</span>
              </div>
              <button
                className="button-secondary compact-button"
                disabled={disabled || !selectedVendor}
                type="button"
                onClick={() => {
                  if (confirm("Remove this image?")) {
                    void onDeleteImage(image.id);
                  }
                }}
              >
                Remove
              </button>
            </li>
          ))}
          {vendorImages.length === 0 ? <li className="empty-state">No vendor images yet.</li> : null}
        </ul>
      </div>
    </section>
  );
}

function FeaturedDishesSection({
  disabled,
  selectedVendor,
  vendorDishes,
  onCreateDishes,
  onDeleteDish,
}: {
  disabled: boolean;
  selectedVendor: AdminVendorSummary | null;
  vendorDishes: VendorFeaturedDish[];
  onCreateDishes: (data: CreateVendorDishesRequest) => Promise<void>;
  onDeleteDish: (dishId: string) => Promise<void>;
}) {
  return (
    <section className="admin-panel" aria-labelledby="featured-dishes">
      <p className="eyebrow">Featured dishes</p>
      <h2 id="featured-dishes">Featured dishes</h2>
      <p className="form-note">
        Featured dishes appear on vendor cards and vendor details. Dish image URL is optional and applies only to that dish.
      </p>
      <ul className="admin-inline-list">
        {vendorDishes.map((dish) => (
          <li key={dish.id}>
            <div className="admin-inline-list-item-copy">
              <strong>{dish.dish_name}</strong>
              <span>{dish.description ?? "No description yet"}</span>
            </div>
            <button
              className="button-secondary compact-button"
              disabled={disabled || !selectedVendor}
              type="button"
              onClick={() => {
                if (confirm(`Remove featured dish "${dish.dish_name}"?`)) {
                  void onDeleteDish(dish.id);
                }
              }}
            >
              Remove
            </button>
          </li>
        ))}
        {vendorDishes.length === 0 ? <li className="empty-state">No featured dishes added yet.</li> : null}
      </ul>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreateDishes(dishesPayload(new FormData(event.currentTarget)));
        }}
      >
        <label className="field field-wide">
          <span>
            Dish name <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input name="dish_name" placeholder="Jollof rice" required />
        </label>
        <label className="field field-wide">
          <span>Description</span>
          <input name="description" placeholder="Short description" />
        </label>
        <label className="field field-wide">
          <span>Optional dish image URL</span>
          <input name="image_url" placeholder="https://..." />
        </label>
        <button className="button-secondary" disabled={disabled || !selectedVendor} type="submit">
          Add dish
        </button>
      </form>
    </section>
  );
}

function UpdateVendorSection({
  selectedVendor,
  completenessLabels,
  canDeleteVendor,
  disabled,
  onUpdateVendor,
  onDeactivateVendor,
}: {
  selectedVendor: AdminVendorSummary | null;
  completenessLabels: string[];
  canDeleteVendor: boolean;
  disabled: boolean;
  onUpdateVendor: (data: UpdateVendorRequest) => Promise<void>;
  onDeactivateVendor: () => Promise<void>;
}) {
  const [fieldErrors, setFieldErrors] = useState<AdminVendorFieldErrors>({});

  async function submitUpdateVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    try {
      await onUpdateVendor(updateVendorPayload(new FormData(event.currentTarget)));
    } catch (error) {
      if (error instanceof AdminApiError && error.code === "VALIDATION_ERROR") {
        const feedback = extractValidationFeedback(error.details);
        setFieldErrors(feedback.fieldErrors as AdminVendorFieldErrors);
      }
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="update-vendor">
      <p className="eyebrow">Selected vendor</p>
      <h2 id="update-vendor">
        {selectedVendor ? selectedVendor.name : "Select a vendor"}
      </h2>
      <p className="form-note">Review details carefully. Slug stays stable unless you edit the slug field directly.</p>
      {selectedVendor && completenessLabels.length > 0 ? (
        <ul className="admin-completeness-list" aria-label="Missing vendor data">
          {completenessLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
      <form className="admin-form" onSubmit={submitUpdateVendor}>
        <UpdateVendorIdentityFields fieldErrors={fieldErrors} selectedVendor={selectedVendor} />
        <div className="action-row">
          <button className="button-primary" disabled={disabled || !selectedVendor} type="submit">
            Update vendor
          </button>
          {canDeleteVendor ? (
            <button
              className="button-danger"
              disabled={disabled || !selectedVendor}
              type="button"
              onClick={() => {
                if (confirm("Deactivate this vendor?")) {
                  void onDeactivateVendor();
                }
              }}
            >
              Deactivate
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function VendorHoursSection({
  selectedVendor,
  vendorHours,
  disabled,
  onReplaceHours,
}: {
  selectedVendor: AdminVendorSummary | null;
  vendorHours: VendorHours[];
  disabled: boolean;
  onReplaceHours: (data: ReplaceVendorHoursRequest) => Promise<void>;
}) {
  const hoursByDay = new Map(vendorHours.map((hours) => [hours.day_of_week, hours]));
  const [hoursFormError, setHoursFormError] = useState<string | null>(null);

  return (
    <section className="admin-panel" aria-labelledby="vendor-hours">
      <p className="eyebrow">Completeness</p>
      <h2 id="vendor-hours">Hours</h2>
      <p className="form-note">Enter hours in 12-hour time. Overnight ranges are allowed.</p>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          setHoursFormError(null);

          if (!event.currentTarget.reportValidity()) {
            return;
          }

          try {
            void onReplaceHours(createHoursPayload(new FormData(event.currentTarget)));
          } catch (error) {
            setHoursFormError(
              error instanceof Error ? error.message : "Unable to prepare hours update.",
            );
          }
        }}
      >
        <div className="hours-grid">
          {dayLabels.map((day, index) => {
            const existingHours = hoursByDay.get(index);
            const openTime = parseStoredTimeForAdmin(existingHours?.open_time ?? null);
            const closeTime = parseStoredTimeForAdmin(existingHours?.close_time ?? null);

            return (
              <div className="hours-row" key={day}>
                <strong>{day}</strong>
                <label className="field">
                  <span>Opens</span>
                  <input
                    defaultValue={openTime}
                    name={`open-${index}`}
                    placeholder="9 AM"
                  />
                </label>
                <label className="field">
                  <span>Closes</span>
                  <input
                    defaultValue={closeTime}
                    name={`close-${index}`}
                    placeholder="8:30 PM"
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    defaultChecked={existingHours?.is_closed ?? false}
                    name={`closed-${index}`}
                    type="checkbox"
                  />
                  <span>Closed</span>
                </label>
              </div>
            );
          })}
        </div>
        <span className="field-hint">Use format like 9 AM or 8:30 PM.</span>
        {hoursFormError ? <span className="field-error">{hoursFormError}</span> : null}
        <button
          className="button-secondary"
          disabled={disabled || !selectedVendor}
          type="submit"
        >
          Save hours
        </button>
      </form>
    </section>
  );
}

function CreateVendorIdentityFields({
  fieldErrors,
  onNameChange,
  onAreaChange,
}: {
  fieldErrors: AdminVendorFieldErrors;
  onNameChange?: (value: string) => void;
  onAreaChange?: (value: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const slugError = slugTouched ? getVendorSlugError(slug) : null;
  const slugHintId = "create-vendor-slug-help";

  function handleNameChange(nextName: string) {
    setName(nextName);
    onNameChange?.(nextName);

    if (!slugTouched) {
      setSlug(nextName.trim().length > 0 ? slugifyVendorName(nextName) : "");
    }
  }

  function handleSlugChange(nextSlug: string) {
    setSlugTouched(true);
    setSlug(nextSlug);
  }

  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span>
            Name <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input
            name="name"
            placeholder="Vendor name"
            required
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
          />
          {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}
        </label>
        <label className="field">
          <span>
            Slug <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input
            aria-describedby={slugHintId}
            aria-invalid={slugError ? "true" : undefined}
            autoComplete="off"
            name="slug"
            pattern={slugPattern.source}
            placeholder="Generated from name"
            title="Use lowercase words separated by hyphens."
            required
            spellCheck={false}
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
          />
          <span id={slugHintId} className={slugError ? "field-error" : "field-hint"}>
            {slugError ?? "Slug controls the public page URL. Change it only when needed."}
          </span>
          {fieldErrors.slug ? <span className="field-error">{fieldErrors.slug}</span> : null}
        </label>
        <label className="field">
          <span>Phone</span>
          <input autoComplete="tel" inputMode="tel" name="phone_number" placeholder="+234..." />
          <span className="field-hint">Use international format if available.</span>
          {fieldErrors.phone_number ? (
            <span className="field-error">{fieldErrors.phone_number}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Area</span>
          <input
            name="area"
            placeholder="Wuse"
            onChange={(event) => onAreaChange?.(event.target.value)}
          />
          {fieldErrors.area ? <span className="field-error">{fieldErrors.area}</span> : null}
        </label>
        <label className="field">
          <span>
            Latitude <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input
            name="latitude"
            placeholder="9.0813"
            inputMode="decimal"
            min={-90}
            max={90}
            required
            step="any"
            title="Use decimal degrees, for example 9.0813."
            type="number"
          />
          <span className="field-hint">Use decimal degrees, for example 9.0813.</span>
          {fieldErrors.latitude ? (
            <span className="field-error">{fieldErrors.latitude}</span>
          ) : null}
        </label>
        <label className="field">
          <span>
            Longitude <span className="field-required" aria-hidden="true">*</span>
          </span>
          <input
            name="longitude"
            placeholder="7.4694"
            inputMode="decimal"
            min={-180}
            max={180}
            required
            step="any"
            title="Use decimal degrees, for example 7.4694."
            type="number"
          />
          <span className="field-hint">Use decimal degrees, for example 7.4694.</span>
          {fieldErrors.longitude ? (
            <span className="field-error">{fieldErrors.longitude}</span>
          ) : null}
        </label>
        <label className="field">
          <span>
            Price band <span className="field-required" aria-hidden="true">*</span>
          </span>
          <select name="price_band" required>
            <option value="">Select</option>
            {priceBands.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
          {fieldErrors.price_band ? (
            <span className="field-error">{fieldErrors.price_band}</span>
          ) : null}
        </label>
      </div>
      <label className="field field-wide">
        <span>Short description</span>
        <textarea name="short_description" placeholder="Short food or vendor cue" rows={3} />
        {fieldErrors.short_description ? (
          <span className="field-error">{fieldErrors.short_description}</span>
        ) : null}
      </label>
      <label className="field field-wide">
        <span>Address</span>
        <input name="address_text" placeholder="Street address" />
        {fieldErrors.address_text ? (
          <span className="field-error">{fieldErrors.address_text}</span>
        ) : null}
      </label>
      <div className="form-grid">
        <label className="field">
          <span>City</span>
          <input defaultValue="Abuja" name="city" />
          {fieldErrors.city ? <span className="field-error">{fieldErrors.city}</span> : null}
        </label>
        <label className="field">
          <span>State</span>
          <input defaultValue="FCT" name="state" />
          {fieldErrors.state ? <span className="field-error">{fieldErrors.state}</span> : null}
        </label>
        <label className="field">
          <span>Country</span>
          <input defaultValue="Nigeria" name="country" />
          {fieldErrors.country ? <span className="field-error">{fieldErrors.country}</span> : null}
        </label>
      </div>
    </>
  );
}

function UpdateVendorIdentityFields({
  selectedVendor,
  fieldErrors,
}: {
  selectedVendor?: AdminVendorSummary | null;
  fieldErrors: AdminVendorFieldErrors;
}) {
  const [name, setName] = useState(selectedVendor?.name ?? "");
  const [slug, setSlug] = useState(selectedVendor?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const slugError = slugTouched ? getVendorSlugError(slug) : null;
  const slugHintId = `update-vendor-slug-help-${selectedVendor?.id ?? "new"}`;

  function handleNameChange(nextName: string) {
    setName(nextName);
  }

  function handleSlugChange(nextSlug: string) {
    setSlugTouched(true);
    setSlug(nextSlug);
  }

  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input
            value={name}
            name="name"
            placeholder="Leave blank to keep current"
            onChange={(event) => handleNameChange(event.target.value)}
          />
          {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            aria-describedby={slugHintId}
            aria-invalid={slugError ? "true" : undefined}
            autoComplete="off"
            name="slug"
            pattern={slugPattern.source}
            placeholder="Edit slug"
            title="Use lowercase words separated by hyphens."
            spellCheck={false}
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
          />
          <span id={slugHintId} className={slugError ? "field-error" : "field-hint"}>
            {slugError ?? "Lowercase letters, numbers, and hyphens only."}
          </span>
          {fieldErrors.slug ? <span className="field-error">{fieldErrors.slug}</span> : null}
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            defaultValue={selectedVendor?.phone_number ?? ""}
            autoComplete="tel"
            inputMode="tel"
            name="phone_number"
            placeholder="+234..."
          />
          <span className="field-hint">Use international format if available.</span>
          {fieldErrors.phone_number ? (
            <span className="field-error">{fieldErrors.phone_number}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Area</span>
          <input defaultValue={selectedVendor?.area ?? ""} name="area" placeholder="Wuse" />
          {fieldErrors.area ? <span className="field-error">{fieldErrors.area}</span> : null}
        </label>
        <label className="field">
          <span>Latitude</span>
          <input
            defaultValue={selectedVendor?.latitude ?? ""}
            name="latitude"
            placeholder="9.0813"
            inputMode="decimal"
            min={-90}
            max={90}
            step="any"
            title="Use decimal degrees, for example 9.0813."
            type="number"
          />
          <span className="field-hint">Use decimal degrees, for example 9.0813.</span>
          {fieldErrors.latitude ? (
            <span className="field-error">{fieldErrors.latitude}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Longitude</span>
          <input
            defaultValue={selectedVendor?.longitude ?? ""}
            name="longitude"
            placeholder="7.4694"
            inputMode="decimal"
            min={-180}
            max={180}
            step="any"
            title="Use decimal degrees, for example 7.4694."
            type="number"
          />
          <span className="field-hint">Use decimal degrees, for example 7.4694.</span>
          {fieldErrors.longitude ? (
            <span className="field-error">{fieldErrors.longitude}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Price band</span>
          <select defaultValue={selectedVendor?.price_band ?? ""} name="price_band">
            <option value="">No change</option>
            {priceBands.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
          {fieldErrors.price_band ? (
            <span className="field-error">{fieldErrors.price_band}</span>
          ) : null}
        </label>
      </div>
      <label className="field field-wide">
        <span>Short description</span>
        <textarea
          defaultValue={selectedVendor?.short_description ?? ""}
          name="short_description"
          placeholder="Short food or vendor cue"
          rows={3}
        />
        {fieldErrors.short_description ? (
          <span className="field-error">{fieldErrors.short_description}</span>
        ) : null}
      </label>
    </>
  );
}
