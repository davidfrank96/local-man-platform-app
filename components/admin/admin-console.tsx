"use client";

import Link from "next/link";
import {
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
  getAdminVendorRatingSignalSummary,
  listAdminVendorDishes,
  listAdminVendorImages,
  listAdminVendorHours,
  listAdminVendors,
  replaceAdminVendorHours,
  updateAdminVendor,
  type AdminVendorDashboardCounts,
  type AdminVendorFilters,
  type AdminVendorSummary,
} from "../../lib/admin/api-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import { useAdminSession } from "./admin-session-provider.tsx";
import {
  VendorCsvUploadPanel,
} from "./admin-vendor-intake.tsx";
import {
  AdminCreateVendorSection,
  EditVendorWorkspace,
  VendorRegistryPanel,
  VendorRegistryList,
} from "./admin-vendor-workspace-sections.tsx";
import { AdminScrollPanel } from "./admin-scroll-panel.tsx";
import {
  fetchPublicCategories,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
import {
  getVendorWorkspaceSnapshot,
  readVendorArtifactCache,
  updateVendorArtifactCache,
  updateVendorWorkspaceSnapshot,
} from "../../lib/admin/workspace-cache.ts";
import type {
  CreateManagedVendorRequest,
  CreateVendorDishesRequest,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  AdminRatingSignalSummary,
  VendorFeaturedDish,
  VendorHours,
  VendorImage,
} from "../../types/index.ts";
import {
  getAdminRoleLabel,
  hasAdminPermission,
} from "../../lib/admin/rbac.ts";
import {
  getVendorSummaryStatusLabels,
  readPriceBand,
  readText,
} from "../../lib/admin/vendor-form-data.ts";

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

function sortVendorImagesByOrder(images: VendorImage[]): VendorImage[] {
  return [...images].sort(
    (left, right) =>
      left.sort_order - right.sort_order ||
      left.id.localeCompare(right.id),
  );
}

function filterVendorImagesForVendor(images: VendorImage[], vendorId: string): VendorImage[] {
  return images.filter((image) => image.vendor_id === vendorId);
}

function mergeVendorImagesById(
  currentImages: VendorImage[],
  incomingImages: VendorImage[],
): VendorImage[] {
  const imagesById = new Map(currentImages.map((image) => [image.id, image]));

  for (const image of incomingImages) {
    imagesById.set(image.id, image);
  }

  return sortVendorImagesByOrder([...imagesById.values()]);
}

function updateVendorImagesCount(
  vendors: AdminVendorSummary[],
  vendorId: string,
  imagesCount: number,
): AdminVendorSummary[] {
  return vendors.map((vendor) =>
    vendor.id === vendorId ? { ...vendor, images_count: imagesCount } : vendor
  );
}

function getLoadedDashboardCountFallback(vendors: AdminVendorSummary[]): AdminVendorDashboardCounts {
  let activeVendorCount = 0;
  let missingHoursCount = 0;
  let missingImagesCount = 0;
  let missingDishesCount = 0;
  let needsFollowUpCount = 0;

  for (const vendor of vendors) {
    const hasMissingHours = vendor.hours_count < 7;
    const hasMissingImages = vendor.images_count < 1;
    const hasMissingDishes = vendor.featured_dishes_count < 1;

    if (vendor.is_active) {
      activeVendorCount += 1;
    }

    if (hasMissingHours) {
      missingHoursCount += 1;
    }

    if (hasMissingImages) {
      missingImagesCount += 1;
    }

    if (hasMissingDishes) {
      missingDishesCount += 1;
    }

    if (hasMissingHours || hasMissingImages || hasMissingDishes) {
      needsFollowUpCount += 1;
    }
  }

  return {
    total_vendor_count: vendors.length,
    active_vendor_count: activeVendorCount,
    missing_hours_count: missingHoursCount,
    missing_images_count: missingImagesCount,
    missing_dishes_count: missingDishesCount,
    needs_follow_up_count: needsFollowUpCount,
  };
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
  const shouldLoadVendorRegistry = mode !== "create";
  const shouldLoadVendorArtifacts = mode === "edit";
  const shouldLoadVendorCategories = mode === "create";
  const workspaceCacheSnapshot = useMemo(
    () => getVendorWorkspaceSnapshot(workspaceCacheScope),
    [workspaceCacheScope],
  );
  const initialCachedVendorId = mode === "create"
    ? null
    : initialSelectedVendorId ?? workspaceCacheSnapshot.selectedVendorId;
  const [dashboardCounts, setDashboardCounts] = useState<AdminVendorDashboardCounts | null>(
    () => workspaceCacheSnapshot.dashboardCounts,
  );
  const [filters, setFilters] = useState<AdminVendorFilters>(() => workspaceCacheSnapshot.filters);
  const [vendors, setVendors] = useState<AdminVendorSummary[]>(() => workspaceCacheSnapshot.vendors);
  const [vendorTotalCount, setVendorTotalCount] = useState<number | null>(
    () => workspaceCacheSnapshot.vendorTotalCount,
  );
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
  const [vendorSignalSummary, setVendorSignalSummary] = useState<AdminRatingSignalSummary | null>(null);
  const [isVendorSignalSummaryLoading, setIsVendorSignalSummaryLoading] = useState(false);
  const [vendorSignalSummaryError, setVendorSignalSummaryError] = useState<string | null>(null);
  const [vendorCategories, setVendorCategories] = useState<PublicCategory[]>([]);
  const vendorImagesRequestId = useRef(0);
  const vendorHoursRequestId = useRef(0);
  const vendorDishesRequestId = useRef(0);
  const vendorSignalSummaryRequestId = useRef(0);
  // These flags shape the visible workspace only. Any restricted read or
  // mutation still has to survive backend RBAC checks on `/api/admin/**`.
  const canReadAnalytics = hasAdminPermission(role, "analytics:read");
  const canManageAdminUsers = hasAdminPermission(role, "admin_users:manage");
  const canDeleteVendor = hasAdminPermission(role, "vendor:delete");

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [selectedVendorId, vendors],
  );
  const {
    incompleteVendors,
  } = useMemo(() => {
    const incomplete: AdminVendorSummary[] = [];

    for (const vendor of vendors) {
      const hasMissingHours = vendor.hours_count < 7;
      const hasMissingImages = vendor.images_count < 1;
      const hasMissingDishes = vendor.featured_dishes_count < 1;

      if (hasMissingHours || hasMissingImages || hasMissingDishes) {
        incomplete.push(vendor);
      }
    }

    return {
      incompleteVendors: incomplete,
    };
  }, [vendors]);
  const statusTone = getAdminStatusTone(status, isLoading);
  const loadedCountFallback = useMemo(() => getLoadedDashboardCountFallback(vendors), [vendors]);
  const dashboardMetricCounts = dashboardCounts ?? {
    ...loadedCountFallback,
    total_vendor_count: vendorTotalCount ?? loadedCountFallback.total_vendor_count,
  };
  const totalVendorCount = dashboardMetricCounts.total_vendor_count;
  const loadedVendorSummary = vendorTotalCount === null
    ? `${vendors.length} loaded`
    : `Showing ${vendors.length} of ${vendorTotalCount}`;

  useEffect(() => {
    updateVendorWorkspaceSnapshot(workspaceCacheScope, {
      dashboardCounts,
      filters,
      vendorTotalCount,
      vendors,
      selectedVendorId,
    });
  }, [dashboardCounts, filters, selectedVendorId, vendorTotalCount, vendors, workspaceCacheScope]);

  useEffect(() => {
    if (!shouldLoadVendorCategories) {
      return;
    }

    let isCancelled = false;

    void fetchPublicCategories()
      .then((categories) => {
        if (!isCancelled) {
          setVendorCategories(categories);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setVendorCategories([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [shouldLoadVendorCategories]);

  const loadVendorImages = useCallback(async function loadVendorImages(
    vendorId: string | null,
    expectedImageCount = 0,
  ) {
    const requestId = ++vendorImagesRequestId.current;

    if (!vendorId || !session) {
      setVendorImages([]);
      return;
    }

    const cachedImages = readVendorArtifactCache(workspaceCacheScope, vendorId, "images");
    const cachedVendorImages = Array.isArray(cachedImages)
      ? filterVendorImagesForVendor(cachedImages as VendorImage[], vendorId)
      : null;

    if (cachedVendorImages && cachedVendorImages.length >= expectedImageCount) {
      setVendorImages(cachedVendorImages);
      return;
    }

    setVendorImages([]);
    const images = await listAdminVendorImages(vendorId);
    const vendorScopedImages = filterVendorImagesForVendor(images, vendorId);

    if (requestId === vendorImagesRequestId.current) {
      setVendorImages(vendorScopedImages);
      updateVendorArtifactCache(workspaceCacheScope, vendorId, "images", vendorScopedImages);
    }
  }, [session, workspaceCacheScope]);

  const loadVendorHours = useCallback(async function loadVendorHours(
    vendorId: string | null,
  ) {
    if (!vendorId || !session) {
      setVendorHours([]);
      return;
    }

    const cachedHours = readVendorArtifactCache(workspaceCacheScope, vendorId, "hours");

    if (cachedHours) {
      setVendorHours(cachedHours as VendorHours[]);
      return;
    }

    const requestId = ++vendorHoursRequestId.current;
    const hours = await listAdminVendorHours(vendorId);

    if (requestId === vendorHoursRequestId.current) {
      setVendorHours(hours);
      updateVendorArtifactCache(workspaceCacheScope, vendorId, "hours", hours);
    }
  }, [session, workspaceCacheScope]);

  const loadVendorDishes = useCallback(async function loadVendorDishes(
    vendorId: string | null,
  ) {
    if (!vendorId || !session) {
      setVendorDishes([]);
      return;
    }

    const cachedDishes = readVendorArtifactCache(workspaceCacheScope, vendorId, "dishes");

    if (cachedDishes) {
      setVendorDishes(cachedDishes as VendorFeaturedDish[]);
      return;
    }

    const requestId = ++vendorDishesRequestId.current;
    const dishes = await listAdminVendorDishes(vendorId);

    if (requestId === vendorDishesRequestId.current) {
      setVendorDishes(dishes);
      updateVendorArtifactCache(workspaceCacheScope, vendorId, "dishes", dishes);
    }
  }, [session, workspaceCacheScope]);

  const loadVendorSignalSummary = useCallback(async function loadVendorSignalSummary(
    vendorId: string | null,
  ) {
    const requestId = ++vendorSignalSummaryRequestId.current;

    if (!vendorId || !session || !canReadAnalytics) {
      setVendorSignalSummary(null);
      setIsVendorSignalSummaryLoading(false);
      setVendorSignalSummaryError(null);
      return;
    }

    setVendorSignalSummary(null);
    setVendorSignalSummaryError(null);
    setIsVendorSignalSummaryLoading(true);

    try {
      const summary = await getAdminVendorRatingSignalSummary(vendorId);

      if (requestId === vendorSignalSummaryRequestId.current) {
        setVendorSignalSummary(summary);
      }
    } catch (error) {
      if (requestId === vendorSignalSummaryRequestId.current) {
        setVendorSignalSummary(null);
        setVendorSignalSummaryError(
          formatAdminErrorStatus(error, "Unable to load rating signal summary."),
        );
      }
    } finally {
      if (requestId === vendorSignalSummaryRequestId.current) {
        setIsVendorSignalSummaryLoading(false);
      }
    }
  }, [canReadAnalytics, session]);

  useEffect(() => {
    if (!shouldLoadVendorArtifacts) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadVendorImages(
        selectedVendor?.id ?? null,
        selectedVendor?.images_count ?? 0,
      ).catch((error) => {
        setVendorImages([]);
        setStatus(error instanceof Error ? error.message : "Unable to load vendor images.");
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadVendorImages, selectedVendor?.id, selectedVendor?.images_count, shouldLoadVendorArtifacts]);

  useEffect(() => {
    if (!shouldLoadVendorArtifacts) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadVendorHours(selectedVendor?.id ?? null).catch((error) => {
        setVendorHours([]);
        setStatus(formatAdminErrorStatus(error, "Unable to load vendor hours."));
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadVendorHours, selectedVendor?.id, shouldLoadVendorArtifacts]);

  useEffect(() => {
    if (!shouldLoadVendorArtifacts) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadVendorDishes(selectedVendor?.id ?? null).catch((error) => {
        setVendorDishes([]);
        setStatus(formatAdminErrorStatus(error, "Unable to load vendor dishes."));
      });
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadVendorDishes, selectedVendor?.id, shouldLoadVendorArtifacts]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!shouldLoadVendorArtifacts || !canReadAnalytics) {
        setVendorSignalSummary(null);
        setIsVendorSignalSummaryLoading(false);
        setVendorSignalSummaryError(null);
        return;
      }

      void loadVendorSignalSummary(selectedVendor?.id ?? null);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    canReadAnalytics,
    loadVendorSignalSummary,
    selectedVendor?.id,
    shouldLoadVendorArtifacts,
  ]);

  const runAdminAction = useCallback(async function runAdminAction<T>(
    action: () => Promise<T>,
    successMessage: string,
    options?: {
      rethrowErrors?: boolean;
    },
  ): Promise<T | null> {
    if (!session) {
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
  }, [session, signOut]);

  const applyVendorListResult = useCallback((result: Awaited<ReturnType<typeof listAdminVendors>>) => {
    setVendors(result.vendors);
    setDashboardCounts(result.dashboard_counts);
    setVendorTotalCount(result.pagination.total_count);
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
      dashboardCounts: result.dashboard_counts,
      filters,
      vendorTotalCount: result.pagination.total_count,
      vendors: result.vendors,
    });
  }, [filters, initialSelectedVendorId, workspaceCacheScope]);

  const refreshVendors = useCallback(async function refreshVendors(nextFilters = filters) {
    const result = await runAdminAction(
      () => listAdminVendors(nextFilters),
      "Vendor list refreshed.",
    );

    if (result) {
      applyVendorListResult(result);
    }
  }, [applyVendorListResult, filters, runAdminAction]);

  const handleIntakeVendorsUploaded = useCallback(async (
    uploadedVendors: Array<{ id: string; name: string; slug: string }>,
  ) => {
    if (uploadedVendors[0]?.id) {
      setSelectedVendorId(uploadedVendors[0].id);
    }

    await refreshVendors();
  }, [refreshVendors]);

  useEffect(() => {
    if (
      !shouldLoadVendorRegistry ||
      !session ||
      isLoading ||
      (vendors.length > 0 && dashboardCounts !== null)
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refreshVendors();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dashboardCounts, isLoading, refreshVendors, session, shouldLoadVendorRegistry, vendors.length]);

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
    data: CreateManagedVendorRequest,
    options?: {
      hoursData: ReplaceVendorHoursRequest | null;
      dishesData: CreateVendorDishesRequest | null;
      imageUpload: FormData | null;
    },
  ) {
    if (!session) {
      setStatus("Admin session is missing. Sign in again.");
      return;
    }

    setIsLoading(true);
    setStatus("Working…");

    try {
      const createdVendor = await createAdminVendor(data);
      const completionMessages = ["Vendor created successfully."];
      const failures: string[] = [];

      let createdHours: VendorHours[] | null = null;
      let createdDishes: VendorFeaturedDish[] | null = null;
      let createdImages: VendorImage[] | null = null;

      if (options?.hoursData) {
        try {
          createdHours = await replaceAdminVendorHours(createdVendor.id, options.hoursData);
          completionMessages.push("Hours updated successfully.");
        } catch (error) {
          failures.push(`Hours update failed: ${formatAdminErrorStatus(error, "Hours update failed.")}`);
        }
      }

      if (options?.dishesData) {
        try {
          createdDishes = await createAdminVendorDishes(createdVendor.id, options.dishesData);
          completionMessages.push("Featured dishes updated successfully.");
        } catch (error) {
          failures.push(`Featured dishes update failed: ${formatAdminErrorStatus(error, "Featured dishes update failed.")}`);
        }
      }

      if (options?.imageUpload) {
        try {
          createdImages = await createAdminVendorImages(createdVendor.id, options.imageUpload);
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
        const refreshed = await listAdminVendors(filters);
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
      () => updateAdminVendor(selectedVendor.id, data),
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
      () => deactivateAdminVendor(selectedVendor.id),
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
      () => replaceAdminVendorHours(selectedVendor.id, data),
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
      () => createAdminVendorImages(selectedVendor.id, data),
      "Image uploaded successfully.",
    );

    if (uploadedImages && selectedVendor) {
      vendorImagesRequestId.current += 1;
      const currentVendorImages = filterVendorImagesForVendor(vendorImages, selectedVendor.id);
      const uploadedVendorImages = filterVendorImagesForVendor(uploadedImages, selectedVendor.id);
      const nextImages = mergeVendorImagesById(currentVendorImages, uploadedVendorImages);

      setVendorImages(nextImages);
      setVendors((current) =>
        updateVendorImagesCount(current, selectedVendor.id, nextImages.length)
      );
      updateVendorArtifactCache(
        workspaceCacheScope,
        selectedVendor.id,
        "images",
        nextImages,
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
      () => deleteAdminVendorImage(selectedVendor.id, imageId),
      "Image removed successfully.",
    );

    if (deletedImage && selectedVendor) {
      vendorImagesRequestId.current += 1;
      const currentVendorImages = filterVendorImagesForVendor(vendorImages, selectedVendor.id);
      const nextImages = currentVendorImages.filter((image) => image.id !== deletedImage.id);

      setVendorImages(nextImages);
      setVendors((current) =>
        updateVendorImagesCount(current, selectedVendor.id, nextImages.length)
      );
      updateVendorArtifactCache(workspaceCacheScope, selectedVendor.id, "images", nextImages);
    }
  }

  async function handleCreateDishes(data: CreateVendorDishesRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before adding dishes.");
      return;
    }

    const dishes = await runAdminAction(
      () => createAdminVendorDishes(selectedVendor.id, data),
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
      () => deleteAdminVendorDish(selectedVendor.id, dishId),
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
              <span>Total vendors</span>
              <strong>{totalVendorCount}</strong>
              <small>{loadedVendorSummary}</small>
            </article>
            <article className="admin-metric-panel">
              <span>Active vendors</span>
              <strong>{dashboardMetricCounts.active_vendor_count}</strong>
              <small>Available to users</small>
            </article>
            <article className="admin-metric-panel">
              <span>Missing hours</span>
              <strong>{dashboardMetricCounts.missing_hours_count}</strong>
              <small>Need schedule completion</small>
            </article>
            <article className="admin-metric-panel">
              <span>Missing images</span>
              <strong>{dashboardMetricCounts.missing_images_count}</strong>
              <small>Need profile media</small>
            </article>
            <article className="admin-metric-panel">
              <span>Missing dishes</span>
              <strong>{dashboardMetricCounts.missing_dishes_count}</strong>
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
                <span>{dashboardMetricCounts.needs_follow_up_count} vendors</span>
              </div>
              <AdminScrollPanel className="admin-scroll-panel-vendors-compact" ariaLabelledBy="admin-dashboard-incomplete">
                <VendorRegistryList
                  vendors={incompleteVendors}
                  selectedVendorId={selectedVendorId}
                  onSelectVendor={setSelectedVendorId}
                  emptyMessage="All loaded vendors have hours, images, and featured dishes."
                  compact
                />
              </AdminScrollPanel>
            </section>
          </section>
        </>
      ) : null}

      {mode === "agent" ? (
        <section className="admin-grid admin-grid-dashboard">
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
            disabled={isLoading}
            onVendorsUploaded={handleIntakeVendorsUploaded}
          />

          <section className="admin-panel" aria-labelledby="agent-dashboard-vendors">
            <div className="admin-section-header">
              <div>
                <p className="eyebrow">Vendor registry</p>
                <h2 id="agent-dashboard-vendors">Loaded vendors</h2>
              </div>
              <span>{loadedVendorSummary}</span>
            </div>
            <AdminScrollPanel className="admin-scroll-panel-vendors-compact" ariaLabelledBy="agent-dashboard-vendors">
              <VendorRegistryList
                vendors={vendors}
                selectedVendorId={selectedVendorId}
                onSelectVendor={setSelectedVendorId}
                emptyMessage="No vendors are loaded yet. Refresh or create a vendor to begin."
                compact
              />
            </AdminScrollPanel>
          </section>
        </section>
      ) : null}

      {mode === "vendors" ? (
        <section className="admin-grid admin-grid-vendors">
          <VendorRegistryPanel
            disabled={isLoading}
            filters={filters}
            selectedVendorId={selectedVendorId}
            totalCount={vendorTotalCount}
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
            vendorCategories={vendorCategories}
          />
          <div className="admin-stack">
            <VendorCsvUploadPanel
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
          </div>
        </section>
      ) : null}

      {mode === "edit" ? (
        <section className="admin-grid admin-grid-edit">
          <VendorRegistryPanel
            disabled={isLoading}
            filters={filters}
            selectedVendorId={selectedVendorId}
            totalCount={vendorTotalCount}
            vendors={vendors}
            onSelectVendor={setSelectedVendorId}
            onSubmitFilters={submitFilters}
          />
          <EditVendorWorkspace
            canDeleteVendor={canDeleteVendor}
            canReadRatingSignals={canReadAnalytics}
            disabled={isLoading}
            isVendorSignalSummaryLoading={isVendorSignalSummaryLoading}
            selectedVendor={selectedVendor}
            vendorDishes={vendorDishes}
            vendorHours={vendorHours}
            vendorImages={vendorImages}
            vendorSignalSummary={vendorSignalSummary}
            vendorSignalSummaryError={vendorSignalSummaryError}
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
