"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  type AdminVendorFilters,
  type AdminVendorSummary,
  type AdminApiError,
} from "../../lib/admin/api-client.ts";
import { extractValidationFeedback } from "../../lib/admin/form-errors.ts";
import {
  parseStoredTimeForAdmin,
} from "../../lib/admin/hours-input.ts";
import {
  extractCreateVendorImageUpload,
  getVendorCompletenessLabels,
  validateVendorCreateIntent,
} from "../../lib/admin/vendor-create-intent.ts";
import {
  createHoursPayload,
  createOnboardingDishesPayload,
  createVendorPayload,
  dishesPayload,
  dayLabels,
  getVendorSummaryStatusLabels,
  priceBands,
  type AdminVendorFieldErrors,
  updateVendorPayload,
} from "../../lib/admin/vendor-form-data.ts";
import {
  getVendorSlugError,
  slugifyVendorName,
} from "../../lib/admin/slug.ts";
import {
  ABUJA_AREA_DEFINITIONS,
  type AbujaAreaGroup,
} from "../../lib/location/area-governance.ts";
import { slugPattern } from "../../lib/validation/common.ts";
import { AdminScrollPanel } from "./admin-scroll-panel.tsx";
import { AdminIcon, type AdminIconName } from "./admin-icons.tsx";
import type {
  AdminRatingSignalSummary,
  CreateManagedVendorRequest,
  CreateVendorDishesRequest,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  VendorFeaturedDish,
  VendorHours,
  VendorImage,
} from "../../types/index.ts";
import type { PublicCategory } from "../../lib/vendors/public-api-client.ts";

type AdminCreateVendorOptions = {
  hoursData: ReplaceVendorHoursRequest | null;
  dishesData: CreateVendorDishesRequest | null;
  imageUpload: FormData | null;
};

const areaGroupLabels: Record<AbujaAreaGroup, string> = {
  core: "Core Areas",
  important: "Important Areas",
  growth: "Growth Areas",
  satellite: "Satellite Areas",
};

const areaGroups: AbujaAreaGroup[] = ["core", "important", "growth", "satellite"];

type AdminFormProps = {
  selectedVendor: AdminVendorSummary | null;
  vendorHours: VendorHours[];
  vendorImages: VendorImage[];
  vendorDishes: VendorFeaturedDish[];
  disabled: boolean;
  onCreateVendor: (
    data: CreateManagedVendorRequest,
    options?: AdminCreateVendorOptions,
  ) => Promise<void>;
  onUpdateVendor: (data: UpdateVendorRequest) => Promise<void>;
  onDeactivateVendor: () => Promise<void>;
  onReplaceHours: (data: ReplaceVendorHoursRequest) => Promise<void>;
  onCreateImages: (data: FormData) => Promise<VendorImage[] | null>;
  onDeleteImage: (imageId: string) => Promise<void>;
  onCreateDishes: (data: CreateVendorDishesRequest) => Promise<void>;
  onDeleteDish: (dishId: string) => Promise<void>;
};

function createLocalImagePreviewUrl(file: File | null) {
  if (!file || typeof URL.createObjectURL !== "function") {
    return null;
  }

  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

function revokeLocalImagePreviewUrl(url: string | null) {
  if (!url || typeof URL.revokeObjectURL !== "function") {
    return;
  }

  try {
    URL.revokeObjectURL(url);
  } catch {
    // Preview cleanup must never interrupt the upload form lifecycle.
  }
}

export const VendorRegistryPanel = memo(function VendorRegistryPanel({
  disabled,
  filters,
  selectedVendorId,
  totalCount,
  vendors,
  onChangePage,
  onSelectVendor,
  onSubmitFilters,
}: {
  disabled: boolean;
  filters: AdminVendorFilters;
  selectedVendorId: string | null;
  totalCount: number | null;
  vendors: AdminVendorSummary[];
  onChangePage?: (offset: number) => void;
  onSelectVendor: (vendorId: string) => void;
  onSubmitFilters: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const limit = Math.max(1, filters.limit ?? 100);
  const offset = Math.max(0, filters.offset ?? 0);
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = totalCount && totalCount > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1;
  const canGoPrevious = offset > 0;
  const canGoNext = totalCount !== null && offset + vendors.length < totalCount;
  const registryCountLabel = totalCount === null
    ? `${vendors.length} loaded`
    : `Showing ${vendors.length} of ${totalCount}`;

  return (
    <section className="admin-panel admin-registry-panel admin-v2-registry-panel" aria-labelledby="vendor-registry">
      <div className="admin-section-header">
        <div>
          <p className="eyebrow">Vendor registry</p>
          <h2 id="vendor-registry">Vendors</h2>
        </div>
        <span>{registryCountLabel}</span>
      </div>

      <form className="admin-form admin-v2-registry-form" onSubmit={onSubmitFilters}>
        <label className="field field-wide admin-v2-registry-search">
          <span className="sr-only">Search vendors</span>
          <AdminIcon name="search" />
          <input defaultValue={filters.search ?? ""} name="search" placeholder="Search vendors..." />
        </label>
        <div className="admin-filter-grid admin-v2-registry-filter-grid">
          <label className="field">
            <span>Area</span>
            <input defaultValue={filters.area ?? ""} name="area" placeholder="All areas" />
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
              <option value="all">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </label>
          <button className="button-secondary admin-v2-filter-button" disabled={disabled} type="submit">
            <AdminIcon name="refresh" />
            <span>Filters</span>
          </button>
        </div>
      </form>

      <AdminScrollPanel className="admin-scroll-panel-vendors" ariaLabelledBy="vendor-registry">
        <VendorRegistryList
          vendors={vendors}
          selectedVendorId={selectedVendorId}
          onSelectVendor={onSelectVendor}
          emptyMessage="No vendors matched the current filters."
        />
      </AdminScrollPanel>
      {totalCount !== null && totalCount > limit && onChangePage ? (
        <nav className="admin-v2-pagination" aria-label="Vendor registry pagination">
          <button
            aria-label="Previous vendor page"
            disabled={disabled || !canGoPrevious}
            type="button"
            onClick={() => onChangePage(Math.max(0, offset - limit))}
          >
            <AdminIcon name="chevron-down" />
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            aria-label="Next vendor page"
            disabled={disabled || !canGoNext}
            type="button"
            onClick={() => onChangePage(offset + limit)}
          >
            <AdminIcon name="chevron-down" />
          </button>
        </nav>
      ) : null}
    </section>
  );
});

export const VendorRegistryList = memo(function VendorRegistryList({
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
        const warningLabels = labels.filter((label) => label.startsWith("Missing"));

        return (
          <li key={vendor.id}>
            <button
              className={selectedVendorId === vendor.id ? "admin-list-item admin-v2-vendor-row selected" : "admin-list-item admin-v2-vendor-row"}
              type="button"
              onClick={() => onSelectVendor(vendor.id)}
            >
              <div className="admin-list-item-copy">
                <div className="admin-list-item-topline">
                  <strong>{vendor.name}</strong>
                  <span className={vendor.is_active ? "admin-v2-status-pill active" : "admin-v2-status-pill pending"}>
                    {vendor.is_active ? "Active" : "Pending"}
                  </span>
                </div>
                <span>{vendor.area ?? "Area missing"}, Abuja</span>
                <small>{warningLabels.length > 0 ? "Review required" : "Ready for review"}</small>
              </div>
              <div className="admin-list-badges admin-v2-row-warnings" aria-label={`${vendor.name} status`}>
                {warningLabels.map((label) => (
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

export function AdminCreateVendorSection({
  disabled,
  onCreateVendor,
  vendorCategories,
}: {
  disabled: boolean;
  onCreateVendor: (
    data: CreateManagedVendorRequest,
    options?: AdminCreateVendorOptions,
  ) => Promise<void>;
  vendorCategories: PublicCategory[];
}) {
  const [createFieldErrors, setCreateFieldErrors] = useState<AdminVendorFieldErrors>({});
  const [createIntentErrors, setCreateIntentErrors] = useState<Partial<Record<
    "hours" | "featured_dishes" | "images",
    string
  >>>({});
  const [pendingCreateVendorImagePreviewUrl, setPendingCreateVendorImagePreviewUrl] = useState<string | null>(null);
  const [pendingCreateVendorImageName, setPendingCreateVendorImageName] = useState<string | null>(null);
  const pendingCreateVendorImagePreviewUrlRef = useRef<string | null>(null);
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
      revokeLocalImagePreviewUrl(pendingCreateVendorImagePreviewUrlRef.current);
    };
  }, []);

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
      revokeLocalImagePreviewUrl(pendingCreateVendorImagePreviewUrlRef.current);
      pendingCreateVendorImagePreviewUrlRef.current = null;
      setPendingCreateVendorImagePreviewUrl(null);
      form.reset();
    } catch (error) {
      if ((error as AdminApiError).code === "VALIDATION_ERROR") {
        const feedback = extractValidationFeedback((error as AdminApiError).details);
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
            vendorCategories={vendorCategories}
            fieldErrors={createFieldErrors}
            onAreaChange={(value) =>
              setCreateSummary((current) => ({
                ...current,
                area: value,
              }))}
            onNameChange={(value) =>
              setCreateSummary((current) => ({
                ...current,
                name: value,
              }))}
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
                }))}
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
                        )}
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
                        )}
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
                        )}
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
                ])}
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
                }))}
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
                const nextPreviewUrl = createLocalImagePreviewUrl(file);

                revokeLocalImagePreviewUrl(pendingCreateVendorImagePreviewUrlRef.current);
                pendingCreateVendorImagePreviewUrlRef.current = nextPreviewUrl;
                setPendingCreateVendorImagePreviewUrl(nextPreviewUrl);
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
                }))}
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

type VendorWorkspaceTab = "overview" | "details" | "hours" | "dishes" | "images" | "signals" | "activity";

type CompletenessItem = {
  id: string;
  label: string;
  status: "complete" | "warning";
};

const workspaceTabs: Array<{ id: VendorWorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "hours", label: "Hours" },
  { id: "dishes", label: "Featured dishes" },
  { id: "images", label: "Images" },
  { id: "signals", label: "Signals" },
  { id: "activity", label: "Activity" },
];

function formatPriceBand(priceBand: AdminVendorSummary["price_band"]): string {
  if (!priceBand) {
    return "Price missing";
  }

  return priceBand[0].toUpperCase() + priceBand.slice(1);
}

function formatInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

function buildCompletenessItems({
  selectedVendor,
  vendorDishes,
  vendorHours,
  vendorImages,
}: {
  selectedVendor: AdminVendorSummary;
  vendorDishes: VendorFeaturedDish[];
  vendorHours: VendorHours[];
  vendorImages: VendorImage[];
}): CompletenessItem[] {
  const hasCoordinates = Number.isFinite(selectedVendor.latitude) && Number.isFinite(selectedVendor.longitude);

  return [
    {
      id: "basic",
      label: "Basic details",
      status: selectedVendor.name && selectedVendor.slug && selectedVendor.area ? "complete" : "warning",
    },
    {
      id: "hours",
      label: "Hours",
      status: vendorHours.length >= 7 || selectedVendor.hours_count >= 7 ? "complete" : "warning",
    },
    {
      id: "dishes",
      label: "Featured dishes",
      status: vendorDishes.length > 0 || selectedVendor.featured_dishes_count > 0 ? "complete" : "warning",
    },
    {
      id: "images",
      label: "Images",
      status: vendorImages.length > 0 || selectedVendor.images_count > 0 ? "complete" : "warning",
    },
    {
      id: "signals",
      label: "Signals",
      status: hasCoordinates ? "complete" : "warning",
    },
  ];
}

function getCompletenessPercent(items: CompletenessItem[]): number {
  if (items.length === 0) {
    return 0;
  }

  const completeCount = items.filter((item) => item.status === "complete").length;
  return Math.round((completeCount / items.length) * 100);
}

function WorkspaceIconTile({ icon }: { icon: AdminIconName }) {
  return (
    <span className="admin-v2-icon-tile" aria-hidden="true">
      <AdminIcon name={icon} />
    </span>
  );
}

function VendorWorkspaceHeader({
  disabled,
  selectedVendor,
  vendorImages,
  onRefreshVendors,
}: {
  disabled: boolean;
  selectedVendor: AdminVendorSummary;
  vendorImages: VendorImage[];
  onRefreshVendors: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const publicPath = `/vendors/${selectedVendor.slug}`;
  const firstImage = vendorImages[0]?.image_url ?? null;

  async function copyPublicLink() {
    const href = typeof window === "undefined"
      ? publicPath
      : `${window.location.origin}${publicPath}`;

    try {
      await navigator.clipboard.writeText(href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="admin-v2-vendor-header" aria-labelledby="admin-v2-vendor-title">
      <div className="admin-v2-vendor-identity">
        <span className="admin-v2-vendor-avatar" aria-hidden="true">
          {firstImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={firstImage} />
          ) : (
            formatInitials(selectedVendor.name)
          )}
        </span>
        <div>
          <h2 id="admin-v2-vendor-title">{selectedVendor.name}</h2>
          <div className="admin-v2-meta-line">
            <span className={selectedVendor.is_active ? "admin-v2-status-pill active" : "admin-v2-status-pill pending"}>
              {selectedVendor.is_active ? "Active" : "Pending"}
            </span>
            <span>{selectedVendor.area ?? "Area missing"}, Abuja</span>
            <span className="admin-v2-price-pill">{formatPriceBand(selectedVendor.price_band)}</span>
          </div>
          <div className="admin-v2-meta-line subtle">
            <span>Last updated from registry data</span>
            <span>Verified</span>
          </div>
        </div>
      </div>
      <div className="admin-v2-vendor-actions">
        <Link className="button-secondary" href={publicPath} target="_blank">
          <span>Open public page</span>
          <AdminIcon name="link" />
        </Link>
        <button className="button-secondary" type="button" onClick={() => void copyPublicLink()}>
          <AdminIcon name="link" />
          <span>{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy link"}</span>
        </button>
        <button className="button-secondary admin-v2-icon-button" disabled={disabled} type="button" onClick={onRefreshVendors}>
          <AdminIcon name="refresh" />
          <span className="sr-only">Refresh vendor list</span>
        </button>
        <details className="admin-v2-more-menu">
          <summary aria-label="More vendor actions">
            <AdminIcon name="more" />
          </summary>
          <div>
            <Link href={`/admin/vendors/${selectedVendor.id}`}>Dedicated edit URL</Link>
            <Link href={publicPath} target="_blank">Public profile</Link>
          </div>
        </details>
      </div>
    </section>
  );
}

function VendorWorkspaceTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: VendorWorkspaceTab;
  onChangeTab: (tab: VendorWorkspaceTab) => void;
}) {
  return (
    <nav className="admin-v2-workspace-tabs" aria-label="Vendor workspace sections">
      {workspaceTabs.map((tab) => (
        <button
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={activeTab === tab.id ? "active" : ""}
          key={tab.id}
          type="button"
          onClick={() => onChangeTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function VendorOverview({
  completenessItems,
  selectedVendor,
  vendorDishes,
  vendorHours,
  vendorImages,
}: {
  completenessItems: CompletenessItem[];
  selectedVendor: AdminVendorSummary;
  vendorDishes: VendorFeaturedDish[];
  vendorHours: VendorHours[];
  vendorImages: VendorImage[];
}) {
  const completenessPercent = getCompletenessPercent(completenessItems);

  return (
    <div className="admin-v2-overview-layout">
      <section className="admin-v2-card admin-v2-overview-card" aria-labelledby="admin-v2-overview-title">
        <div className="admin-v2-card-heading">
          <h3 id="admin-v2-overview-title">Vendor overview</h3>
          <p>Key information and status at a glance.</p>
        </div>
        <dl className="admin-v2-fact-grid">
          <div>
            <WorkspaceIconTile icon="shield" />
            <dt>Status</dt>
            <dd>{selectedVendor.is_active ? "Active" : "Pending"}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="link" />
            <dt>Public page</dt>
            <dd>/vendors/{selectedVendor.slug}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="storefront" />
            <dt>Area</dt>
            <dd>{selectedVendor.area ?? "Area missing"}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="activity" />
            <dt>Latitude</dt>
            <dd>{selectedVendor.latitude}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="clipboard" />
            <dt>Price band</dt>
            <dd>{formatPriceBand(selectedVendor.price_band)}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="activity" />
            <dt>Longitude</dt>
            <dd>{selectedVendor.longitude}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="lock" />
            <dt>Phone</dt>
            <dd>{selectedVendor.phone_number ?? "Phone missing"}</dd>
          </div>
          <div>
            <WorkspaceIconTile icon="file" />
            <dt>Linked data</dt>
            <dd>{vendorHours.length} hours, {vendorDishes.length} dishes, {vendorImages.length} images</dd>
          </div>
        </dl>
      </section>

      <section className="admin-v2-card admin-v2-completeness-card" aria-labelledby="admin-v2-completeness-title">
        <h3 id="admin-v2-completeness-title">Completeness</h3>
        <div
          aria-label={`${completenessPercent}% complete`}
          className="admin-v2-progress-ring"
          style={{ "--admin-v2-progress": `${completenessPercent}%` } as CSSProperties}
        >
          <strong>{completenessPercent}%</strong>
          <span>Complete</span>
        </div>
        <ul className="admin-v2-completeness-list">
          {completenessItems.map((item) => (
            <li className={item.status} key={item.id}>
              <span>{item.label}</span>
              <AdminIcon name={item.status === "complete" ? "shield" : "activity"} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function VendorSignals({
  isLoading,
  summary,
  error,
}: {
  error: string | null;
  isLoading: boolean;
  summary: AdminRatingSignalSummary | null;
}) {
  const metrics: Array<[string, number, AdminIconName]> = summary
    ? [
        ["Positive signals", summary.positive_signal_count, "shield"],
        ["Neutral signals", summary.neutral_signal_count, "lock"],
        ["Negative signals", summary.negative_signal_count, "activity"],
        ["Food safety", summary.food_safety_concern_count, "utensils"],
        ["Poor hygiene", summary.poor_hygiene_count, "shield"],
        ["Vendor unavailable", summary.vendor_unavailable_count, "activity"],
        ["Recent 30 days", summary.recent_signal_count, "file"],
      ]
    : [];

  return (
    <section className="admin-v2-card admin-v2-signals-card" aria-labelledby="admin-v2-signals-title">
      <div className="admin-v2-card-heading">
        <h3 id="admin-v2-signals-title">Operational signals</h3>
        <p>Aggregate counts for internal monitoring only.</p>
      </div>
      {isLoading ? (
        <p className="empty-state">Loading signal summary…</p>
      ) : error ? (
        <p className="field-error">{error}</p>
      ) : metrics.length > 0 ? (
        <dl className="admin-v2-signal-grid">
          {metrics.map(([label, value, icon]) => (
            <div key={label}>
              <WorkspaceIconTile icon={icon} />
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="empty-state">No rating signal data loaded yet.</p>
      )}
    </section>
  );
}

function VendorActivity() {
  return (
    <section className="admin-v2-card admin-v2-activity-card" aria-labelledby="admin-v2-activity-title">
      <div className="admin-v2-activity-heading">
        <h3 id="admin-v2-activity-title">Recent activity</h3>
        <Link className="button-secondary compact-button" href="/admin/activity">View all</Link>
      </div>
      <p className="empty-state">
        Vendor-scoped activity is not loaded in this workspace yet. Open Activity for the complete audit trail.
      </p>
    </section>
  );
}

export function EditVendorWorkspace({
  canDeleteVendor,
  canReadRatingSignals,
  disabled,
  isVendorSignalSummaryLoading,
  selectedVendor,
  vendorHours,
  vendorImages,
  vendorDishes,
  vendorSignalSummary,
  vendorSignalSummaryError,
  onUpdateVendor,
  onDeactivateVendor,
  onReplaceHours,
  onCreateImages,
  onDeleteImage,
  onCreateDishes,
  onDeleteDish,
  onRefreshVendors,
}: Omit<AdminFormProps, "onCreateVendor"> & {
  canDeleteVendor: boolean;
  canReadRatingSignals: boolean;
  isVendorSignalSummaryLoading: boolean;
  onRefreshVendors: () => void;
  vendorSignalSummary: AdminRatingSignalSummary | null;
  vendorSignalSummaryError: string | null;
}) {
  const [activeTab, setActiveTab] = useState<VendorWorkspaceTab>("overview");
  const completenessLabels = useMemo(
    () =>
      getVendorCompletenessLabels({
        hours: vendorHours,
        images: vendorImages,
        dishes: vendorDishes,
    }),
    [vendorDishes, vendorHours, vendorImages],
  );
  const completenessItems = useMemo(
    () =>
      selectedVendor
        ? buildCompletenessItems({
            selectedVendor,
            vendorDishes,
            vendorHours,
            vendorImages,
          })
        : [],
    [selectedVendor, vendorDishes, vendorHours, vendorImages],
  );

  if (!selectedVendor) {
    return (
      <section className="admin-panel admin-v2-workspace-empty" aria-labelledby="edit-vendor-empty">
        <p className="eyebrow">Edit workspace</p>
        <h2 id="edit-vendor-empty">Select a vendor</h2>
        <p className="empty-state">
          Choose a vendor from the registry to open details, hours, featured dishes, and images.
        </p>
      </section>
    );
  }

  return (
    <section className="admin-v2-workspace" aria-labelledby="admin-v2-vendor-title">
      <VendorWorkspaceHeader
        disabled={disabled}
        selectedVendor={selectedVendor}
        vendorImages={vendorImages}
        onRefreshVendors={onRefreshVendors}
      />
      <VendorWorkspaceTabs activeTab={activeTab} onChangeTab={setActiveTab} />
      <div className="admin-v2-workspace-content">
        {activeTab === "overview" ? (
          <>
            <VendorOverview
              completenessItems={completenessItems}
              selectedVendor={selectedVendor}
              vendorDishes={vendorDishes}
              vendorHours={vendorHours}
              vendorImages={vendorImages}
            />
            <div className="admin-v2-lower-grid">
              {canReadRatingSignals ? (
                <VendorSignals
                  error={vendorSignalSummaryError}
                  isLoading={isVendorSignalSummaryLoading}
                  summary={vendorSignalSummary}
                />
              ) : (
                <section className="admin-v2-card" aria-labelledby="admin-v2-signals-locked">
                  <h3 id="admin-v2-signals-locked">Operational signals</h3>
                  <p className="empty-state">You do not have permission to view signal aggregates.</p>
                </section>
              )}
              <VendorActivity />
            </div>
          </>
        ) : null}

        {activeTab === "details" ? (
          <div id="edit-basic-details" className="admin-v2-section-panel">
            <UpdateVendorSection
              canDeleteVendor={canDeleteVendor}
              disabled={disabled}
              onDeactivateVendor={onDeactivateVendor}
              onUpdateVendor={onUpdateVendor}
              selectedVendor={selectedVendor}
              completenessLabels={completenessLabels}
            />
          </div>
        ) : null}

        {activeTab === "hours" ? (
          <div id="edit-hours" className="admin-v2-section-panel">
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
        ) : null}

        {activeTab === "dishes" ? (
          <div id="edit-dishes" className="admin-v2-section-panel">
            <FeaturedDishesSection
              disabled={disabled}
              selectedVendor={selectedVendor}
              vendorDishes={vendorDishes}
              onCreateDishes={onCreateDishes}
              onDeleteDish={onDeleteDish}
            />
          </div>
        ) : null}

        {activeTab === "images" ? (
          <div id="edit-images" className="admin-v2-section-panel">
            <VendorImagesSection
              key={`vendor-images:${selectedVendor.id}`}
              disabled={disabled}
              selectedVendor={selectedVendor}
              vendorImages={vendorImages}
              onCreateImages={onCreateImages}
              onDeleteImage={onDeleteImage}
            />
          </div>
        ) : null}

        {activeTab === "signals" ? (
          <div className="admin-v2-section-panel">
            {canReadRatingSignals ? (
              <RatingSignalInsightsPanel
                error={vendorSignalSummaryError}
                isLoading={isVendorSignalSummaryLoading}
                summary={vendorSignalSummary}
              />
            ) : (
              <section className="admin-panel">
                <h2>Operational signals</h2>
                <p className="empty-state">You do not have permission to view signal aggregates.</p>
              </section>
            )}
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <div className="admin-v2-section-panel">
            <VendorActivity />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RatingSignalInsightsPanel({
  error,
  isLoading,
  summary,
}: {
  error: string | null;
  isLoading: boolean;
  summary: AdminRatingSignalSummary | null;
}) {
  const metrics: Array<[string, number]> = summary
    ? [
        ["Positive signals", summary.positive_signal_count],
        ["Neutral signals", summary.neutral_signal_count],
        ["Negative/internal signals", summary.negative_signal_count],
        ["Food safety concern", summary.food_safety_concern_count],
        ["Poor hygiene", summary.poor_hygiene_count],
        ["Vendor unavailable", summary.vendor_unavailable_count],
        ["Recent 30 days", summary.recent_signal_count],
      ]
    : [];

  return (
    <section className="admin-rating-signal-panel" aria-labelledby="rating-signal-insights">
      <div className="admin-section-header">
        <div>
          <p className="eyebrow">Internal signals</p>
          <h3 id="rating-signal-insights">Rating signal insights</h3>
        </div>
      </div>
      <p className="admin-rating-signal-note">
        Admin-only aggregate counts for operational moderation. This does not expose rating identities,
        anonymous hashes, IPs, or per-rating signal rows.
      </p>
      {isLoading ? (
        <p className="empty-state">Loading signal summary…</p>
      ) : error ? (
        <p className="field-error">{error}</p>
      ) : summary ? (
        <dl className="admin-rating-signal-grid">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="empty-state">No rating signal data loaded yet.</p>
      )}
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
  const [pendingVendorImageFile, setPendingVendorImageFile] = useState<File | null>(null);
  const [pendingVendorImagePreviewUrl, setPendingVendorImagePreviewUrl] = useState<string | null>(null);
  const [pendingVendorImageName, setPendingVendorImageName] = useState<string | null>(null);
  const pendingVendorImageFileRef = useRef<File | null>(null);
  const pendingVendorImagePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      revokeLocalImagePreviewUrl(pendingVendorImagePreviewUrlRef.current);
    };
  }, []);

  return (
    <section className="admin-panel" aria-labelledby="vendor-images">
      <p className="eyebrow">Vendor profile images</p>
      <h2 id="vendor-images">Vendor images</h2>
      <p className="form-note">
        These images appear on the vendor public profile. They are different from optional featured dish image URLs.
      </p>
      <form
        className="admin-form"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const imageInput = form.elements.namedItem("image");
          const sortOrderInput = form.elements.namedItem("sort_order");
          const currentInputFile = imageInput instanceof HTMLInputElement ? imageInput.files?.[0] ?? null : null;
          const selectedImageFile =
            currentInputFile ??
            pendingVendorImageFileRef.current ??
            pendingVendorImageFile;

          if (!selectedImageFile) {
            form.reportValidity();
            return;
          }

          if (sortOrderInput instanceof HTMLInputElement && !sortOrderInput.reportValidity()) {
            return;
          }

          const formData = new FormData(form);
          formData.set("image", selectedImageFile);

          const uploadedImages = await onCreateImages(formData);

          if (uploadedImages) {
            pendingVendorImageFileRef.current = null;
            setPendingVendorImageFile(null);
            setPendingVendorImageName(null);
            revokeLocalImagePreviewUrl(pendingVendorImagePreviewUrlRef.current);
            pendingVendorImagePreviewUrlRef.current = null;
            setPendingVendorImagePreviewUrl(null);
            form.reset();
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
              const nextPreviewUrl = createLocalImagePreviewUrl(file);

              revokeLocalImagePreviewUrl(pendingVendorImagePreviewUrlRef.current);
              pendingVendorImageFileRef.current = file;
              pendingVendorImagePreviewUrlRef.current = nextPreviewUrl;
              setPendingVendorImageFile(file);
              setPendingVendorImagePreviewUrl(nextPreviewUrl);
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
      if ((error as AdminApiError).code === "VALIDATION_ERROR") {
        const feedback = extractValidationFeedback((error as AdminApiError).details);
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
  vendorCategories,
  fieldErrors,
  onNameChange,
  onAreaChange,
}: {
  vendorCategories: PublicCategory[];
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
          {fieldErrors.name ? (
            <span className="field-error">{fieldErrors.name}</span>
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
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
      </div>
      <div className="form-grid">
        <label className="field">
          <span>
            Category <span className="field-required" aria-hidden="true">*</span>
          </span>
          <select defaultValue="" name="category_slug" required>
            <option value="">Select</option>
            {vendorCategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          {fieldErrors.category_slug ? (
            <span className="field-error">{fieldErrors.category_slug}</span>
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
        </label>
        <label className="field">
          <span>Phone</span>
          <input autoComplete="tel" inputMode="tel" name="phone_number" placeholder="+234..." />
          <span className="field-hint">Use international format if available.</span>
          {fieldErrors.phone_number ? (
            <span className="field-error">{fieldErrors.phone_number}</span>
          ) : null}
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>
            Area <span className="field-required" aria-hidden="true">*</span>
          </span>
          <select
            defaultValue=""
            name="area"
            required
            onChange={(event) => onAreaChange?.(event.target.value)}
          >
            <option value="">Select area</option>
            {areaGroups.map((group) => (
              <optgroup key={group} label={areaGroupLabels[group]}>
                {ABUJA_AREA_DEFINITIONS
                  .filter((area) => area.group === group)
                  .map((area) => (
                    <option key={area.id} value={area.name}>
                      {area.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {fieldErrors.area ? (
            <span className="field-error">{fieldErrors.area}</span>
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
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
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
        </label>
      </div>
      <div className="form-grid form-grid-coordinates">
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
          {fieldErrors.name ? (
            <span className="field-error">{fieldErrors.name}</span>
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
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
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Area</span>
          <input defaultValue={selectedVendor?.area ?? ""} name="area" placeholder="Wuse" />
          {fieldErrors.area ? (
            <span className="field-error">{fieldErrors.area}</span>
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
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
          ) : (
            <span aria-hidden="true" className="field-hint field-hint-placeholder">
              Placeholder
            </span>
          )}
        </label>
      </div>
      <div className="form-grid form-grid-coordinates">
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
          {fieldErrors.latitude ? <span className="field-error">{fieldErrors.latitude}</span> : null}
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
          {fieldErrors.longitude ? <span className="field-error">{fieldErrors.longitude}</span> : null}
        </label>
      </div>
      <div className="form-grid">
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
        <div aria-hidden="true" className="field field-spacer" />
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
