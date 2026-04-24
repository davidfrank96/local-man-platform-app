"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  createAdminVendor,
  createAdminVendorDishes,
  createAdminVendorImages,
  deactivateAdminVendor,
  listAdminVendors,
  replaceAdminVendorHours,
  updateAdminVendor,
  type AdminVendorFilters,
  type AdminVendorSummary,
} from "../../lib/admin/api-client.ts";
import type {
  CreateVendorDishesRequest,
  CreateVendorRequest,
  PriceBand,
  ReplaceVendorHoursRequest,
  UpdateVendorRequest,
  VendorImageMetadataRequest,
} from "../../types/index.ts";
import {
  getVendorSlugError,
  slugifyVendorName,
} from "../../lib/admin/slug.ts";
import { slugPattern } from "../../lib/validation/common.ts";

const priceBands: PriceBand[] = ["budget", "standard", "premium"];
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

function createHoursPayload(formData: FormData): ReplaceVendorHoursRequest {
  return {
    hours: dayLabels.map((_, dayOfWeek) => {
      const isClosed = formData.get(`closed-${dayOfWeek}`) === "on";

      return {
        day_of_week: dayOfWeek,
        open_time: isClosed ? null : readNullableText(formData, `open-${dayOfWeek}`),
        close_time: isClosed ? null : readNullableText(formData, `close-${dayOfWeek}`),
        is_closed: isClosed,
      };
    }),
  };
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

function imagesPayload(formData: FormData): VendorImageMetadataRequest {
  return {
    images: [
      {
        image_url: String(formData.get("image_url") ?? ""),
        sort_order: Number(String(formData.get("sort_order") ?? "0")),
      },
    ],
  };
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

type AdminFormProps = {
  selectedVendor: AdminVendorSummary | null;
  disabled: boolean;
  onCreateVendor: (data: CreateVendorRequest) => Promise<void>;
  onUpdateVendor: (data: UpdateVendorRequest) => Promise<void>;
  onDeactivateVendor: () => Promise<void>;
  onReplaceHours: (data: ReplaceVendorHoursRequest) => Promise<void>;
  onCreateImages: (data: VendorImageMetadataRequest) => Promise<void>;
  onCreateDishes: (data: CreateVendorDishesRequest) => Promise<void>;
};

type AdminConsoleProps = {
  initialSelectedVendorId?: string | null;
};

export function AdminConsole({
  initialSelectedVendorId = null,
}: AdminConsoleProps) {
  const [accessToken, setAccessToken] = useState("");
  const [filters, setFilters] = useState<AdminVendorFilters>({ is_active: true });
  const [vendors, setVendors] = useState<AdminVendorSummary[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    initialSelectedVendorId,
  );
  const [status, setStatus] = useState("Enter an admin access token to load vendors.");
  const [isLoading, setIsLoading] = useState(false);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [selectedVendorId, vendors],
  );

  async function runAdminAction<T>(
    action: () => Promise<T>,
    successMessage: string,
  ): Promise<T | null> {
    if (accessToken.trim().length === 0) {
      setStatus("Admin access token is required.");
      return null;
    }

    setIsLoading(true);
    setStatus("Working…");

    try {
      const result = await action();
      setStatus(successMessage);
      return result;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin request failed.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshVendors(nextFilters = filters) {
    const result = await runAdminAction(
      () => listAdminVendors(nextFilters, { accessToken: accessToken.trim() }),
      "Vendor list refreshed.",
    );

    if (result) {
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
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFilters: AdminVendorFilters = {
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

  async function handleCreateVendor(data: CreateVendorRequest) {
    const createdVendor = await runAdminAction(
      () => createAdminVendor(data, { accessToken: accessToken.trim() }),
      "Vendor created.",
    );

    if (createdVendor) {
      await refreshVendors();
      setSelectedVendorId(createdVendor.id);
    }
  }

  async function handleUpdateVendor(data: UpdateVendorRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before updating.");
      return;
    }

    const updatedVendor = await runAdminAction(
      () => updateAdminVendor(selectedVendor.id, data, { accessToken: accessToken.trim() }),
      "Vendor updated.",
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
      () => deactivateAdminVendor(selectedVendor.id, { accessToken: accessToken.trim() }),
      "Vendor deactivated.",
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

    await runAdminAction(
      () =>
        replaceAdminVendorHours(selectedVendor.id, data, {
          accessToken: accessToken.trim(),
        }),
      "Vendor hours replaced.",
    );
  }

  async function handleCreateImages(data: VendorImageMetadataRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before adding images.");
      return;
    }

    await runAdminAction(
      () =>
        createAdminVendorImages(selectedVendor.id, data, {
          accessToken: accessToken.trim(),
        }),
      "Vendor image metadata added.",
    );
  }

  async function handleCreateDishes(data: CreateVendorDishesRequest) {
    if (!selectedVendor) {
      setStatus("Select a vendor before adding dishes.");
      return;
    }

    await runAdminAction(
      () =>
        createAdminVendorDishes(selectedVendor.id, data, {
          accessToken: accessToken.trim(),
        }),
      "Vendor dish added.",
    );
  }

  return (
    <div className="admin-console">
      <section className="admin-panel admin-token-panel" aria-labelledby="admin-token">
        <div>
          <p className="eyebrow">Admin access</p>
          <h2 id="admin-token">Runtime token</h2>
        </div>
        <label className="field field-wide">
          <span>Supabase access token</span>
          <input
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            autoComplete="off"
            placeholder="Paste admin bearer token"
            spellCheck={false}
            type="password"
          />
        </label>
        <button
          className="button-primary"
          disabled={isLoading}
          type="button"
          onClick={() => void refreshVendors()}
        >
          Load vendors
        </button>
      </section>

      <section className="admin-panel" aria-live="polite">
        <strong>Status</strong>
        <p>{status}</p>
      </section>

      <section className="admin-grid">
        <div className="admin-stack">
          <section className="admin-panel" aria-labelledby="admin-vendors">
            <div className="admin-section-header">
              <div>
                <p className="eyebrow">Vendor data</p>
                <h2 id="admin-vendors">Vendors</h2>
              </div>
              <span>{vendors.length} loaded</span>
            </div>
            <form className="admin-form compact-form" onSubmit={submitFilters}>
              <label className="field">
                <span>Search</span>
                <input name="search" placeholder="Name or description" />
              </label>
              <label className="field">
                <span>Area</span>
                <input name="area" placeholder="Wuse" />
              </label>
              <label className="field">
                <span>Status</span>
                <select name="is_active" defaultValue="true">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label className="field">
                <span>Price</span>
                <select name="price_band" defaultValue="">
                  <option value="">Any</option>
                  {priceBands.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button-secondary" disabled={isLoading} type="submit">
                Apply filters
              </button>
            </form>
            <ul className="admin-list">
              {vendors.map((vendor) => (
                <li key={vendor.id}>
                  <button
                    className={
                      vendor.id === selectedVendorId
                        ? "admin-list-item selected"
                        : "admin-list-item"
                    }
                    type="button"
                    onClick={() => setSelectedVendorId(vendor.id)}
                  >
                    <strong>{vendor.name}</strong>
                    <span>{vendor.area ?? "Area missing"}</span>
                    <span>{vendor.is_active ? "Active" : "Inactive"}</span>
                  </button>
                </li>
              ))}
              {vendors.length === 0 ? (
                <li className="empty-state">No vendors loaded yet.</li>
              ) : null}
            </ul>
          </section>
        </div>

        <AdminForms
          disabled={isLoading}
          selectedVendor={selectedVendor}
          onCreateVendor={handleCreateVendor}
          onUpdateVendor={handleUpdateVendor}
          onDeactivateVendor={handleDeactivateVendor}
          onReplaceHours={handleReplaceHours}
          onCreateImages={handleCreateImages}
          onCreateDishes={handleCreateDishes}
        />
      </section>
    </div>
  );
}

function AdminForms({
  selectedVendor,
  disabled,
  onCreateVendor,
  onUpdateVendor,
  onDeactivateVendor,
  onReplaceHours,
  onCreateImages,
  onCreateDishes,
}: AdminFormProps) {
  return (
    <div className="admin-stack">
      <section className="admin-panel" aria-labelledby="create-vendor">
        <p className="eyebrow">Create</p>
        <h2 id="create-vendor">New vendor</h2>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!event.currentTarget.reportValidity()) {
              return;
            }
            void onCreateVendor(createVendorPayload(new FormData(event.currentTarget)));
          }}
        >
          <CreateVendorIdentityFields />
          <button className="button-primary" disabled={disabled} type="submit">
            Create vendor
          </button>
        </form>
      </section>

      <section className="admin-panel" aria-labelledby="update-vendor">
        <p className="eyebrow">Selected vendor</p>
        <h2 id="update-vendor">
          {selectedVendor ? selectedVendor.name : "Select a vendor"}
        </h2>
        <form
          className="admin-form"
          key={selectedVendor?.id ?? "no-selected-vendor"}
          onSubmit={(event) => {
            event.preventDefault();
            void onUpdateVendor(updateVendorPayload(new FormData(event.currentTarget)));
          }}
        >
          <UpdateVendorIdentityFields selectedVendor={selectedVendor} />
          <div className="action-row">
            <button
              className="button-primary"
              disabled={disabled || !selectedVendor}
              type="submit"
            >
              Update vendor
            </button>
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
          </div>
        </form>
      </section>

      <section className="admin-panel" aria-labelledby="vendor-hours">
        <p className="eyebrow">Completeness</p>
        <h2 id="vendor-hours">Hours</h2>
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onReplaceHours(createHoursPayload(new FormData(event.currentTarget)));
          }}
        >
          <div className="hours-grid">
            {dayLabels.map((day, index) => (
              <div className="hours-row" key={day}>
                <strong>{day}</strong>
                <label className="field">
                  <span>Open</span>
                  <input name={`open-${index}`} placeholder="09:00" />
                </label>
                <label className="field">
                  <span>Close</span>
                  <input name={`close-${index}`} placeholder="21:00" />
                </label>
                <label className="checkbox-field">
                  <input name={`closed-${index}`} type="checkbox" />
                  <span>Closed</span>
                </label>
              </div>
            ))}
          </div>
          <button
            className="button-secondary"
            disabled={disabled || !selectedVendor}
            type="submit"
          >
            Replace hours
          </button>
        </form>
      </section>

      <section className="admin-panel split-panel" aria-labelledby="vendor-media">
        <div>
          <p className="eyebrow">Media</p>
          <h2 id="vendor-media">Image metadata</h2>
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreateImages(imagesPayload(new FormData(event.currentTarget)));
            }}
          >
            <label className="field field-wide">
              <span>Image URL</span>
              <input name="image_url" placeholder="https://..." />
            </label>
            <label className="field">
              <span>Sort order</span>
              <input defaultValue="0" name="sort_order" type="number" />
            </label>
            <button
              className="button-secondary"
              disabled={disabled || !selectedVendor}
              type="submit"
            >
              Add image
            </button>
          </form>
        </div>
        <div>
          <p className="eyebrow">Menu cue</p>
          <h2>Featured dish</h2>
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreateDishes(dishesPayload(new FormData(event.currentTarget)));
            }}
          >
            <label className="field field-wide">
              <span>Dish name</span>
              <input name="dish_name" placeholder="Jollof rice" />
            </label>
            <label className="field field-wide">
              <span>Description</span>
              <input name="description" placeholder="Short description" />
            </label>
            <label className="field field-wide">
              <span>Image URL</span>
              <input name="image_url" placeholder="https://..." />
            </label>
            <button
              className="button-secondary"
              disabled={disabled || !selectedVendor}
              type="submit"
            >
              Add dish
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function CreateVendorIdentityFields() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const slugError = slugTouched ? getVendorSlugError(slug) : null;
  const slugHintId = "create-vendor-slug-help";

  function handleNameChange(nextName: string) {
    setName(nextName);

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
          <span>Name</span>
          <input
            name="name"
            placeholder="Vendor name"
            required
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            aria-describedby={slugHintId}
            aria-invalid={slugError ? "true" : undefined}
            autoComplete="off"
            name="slug"
            pattern={slugPattern.source}
            placeholder="Generated from name"
            required
            spellCheck={false}
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
          />
          <span id={slugHintId} className={slugError ? "field-error" : "field-hint"}>
            {slugError ?? "Lowercase letters, numbers, and hyphens only."}
          </span>
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone_number" placeholder="+234..." />
        </label>
        <label className="field">
          <span>Area</span>
          <input name="area" placeholder="Wuse" />
        </label>
        <label className="field">
          <span>Latitude</span>
          <input
            name="latitude"
            placeholder="9.0813"
            required
            step="any"
            type="number"
          />
        </label>
        <label className="field">
          <span>Longitude</span>
          <input
            name="longitude"
            placeholder="7.4694"
            required
            step="any"
            type="number"
          />
        </label>
        <label className="field">
          <span>Price band</span>
          <select name="price_band" required>
            <option value="">Select</option>
            {priceBands.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field field-wide">
        <span>Short description</span>
        <textarea name="short_description" placeholder="Short food or vendor cue" rows={3} />
      </label>
      <label className="field field-wide">
        <span>Address</span>
        <input name="address_text" placeholder="Street address" />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>City</span>
          <input defaultValue="Abuja" name="city" />
        </label>
        <label className="field">
          <span>State</span>
          <input defaultValue="FCT" name="state" />
        </label>
        <label className="field">
          <span>Country</span>
          <input defaultValue="Nigeria" name="country" />
        </label>
      </div>
    </>
  );
}

function UpdateVendorIdentityFields({
  selectedVendor,
}: {
  selectedVendor?: AdminVendorSummary | null;
}) {
  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input
            defaultValue={selectedVendor?.name ?? ""}
            name="name"
            placeholder="Leave blank to keep current"
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            defaultValue={selectedVendor?.phone_number ?? ""}
            name="phone_number"
            placeholder="+234..."
          />
        </label>
        <label className="field">
          <span>Area</span>
          <input defaultValue={selectedVendor?.area ?? ""} name="area" placeholder="Wuse" />
        </label>
        <label className="field">
          <span>Latitude</span>
          <input
            defaultValue={selectedVendor?.latitude ?? ""}
            name="latitude"
            placeholder="9.0813"
            step="any"
            type="number"
          />
        </label>
        <label className="field">
          <span>Longitude</span>
          <input
            defaultValue={selectedVendor?.longitude ?? ""}
            name="longitude"
            placeholder="7.4694"
            step="any"
            type="number"
          />
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
      </label>
    </>
  );
}
