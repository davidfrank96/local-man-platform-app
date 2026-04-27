import { useId, useState, type FormEvent } from "react";
import type { LocationSource, PriceBand } from "../../types/index.ts";
import type { PublicCategory } from "../../lib/vendors/public-api-client.ts";
import { trackPublicUserAction } from "../../lib/public/user-action-tracking.ts";
import { countActiveDiscoveryFilters } from "../../lib/vendors/discovery-ranking.ts";

export type DiscoveryFilters = {
  search: string;
  radiusKm: number;
  openNow: boolean;
  priceBand: PriceBand | "";
  category: string;
};

type VendorFiltersProps = {
  filters: DiscoveryFilters;
  categories: PublicCategory[];
  locationSource?: LocationSource | null;
  onChange: (filters: DiscoveryFilters) => void;
  variant?: "default" | "mobileFloating" | "desktopFloating";
  panelOpen?: boolean;
  onTogglePanel?: () => void;
};

const radiusOptions = [1, 5, 10, 30];
const priceBands: PriceBand[] = ["budget", "standard", "premium"];
const defaultFilters: DiscoveryFilters = {
  search: "",
  radiusKm: 10,
  openNow: false,
  priceBand: "",
  category: "",
};

function readFormFilters(form: HTMLFormElement): DiscoveryFilters {
  const formData = new FormData(form);

  return {
    search: String(formData.get("search") ?? "").trim(),
    radiusKm: Number(String(formData.get("radiusKm") ?? "10")),
    openNow: formData.get("openNow") === "on",
    priceBand: String(formData.get("priceBand") ?? "") as DiscoveryFilters["priceBand"],
    category: String(formData.get("category") ?? "").trim(),
  };
}

export function VendorFilters({
  filters,
  categories,
  locationSource,
  onChange,
  variant = "default",
  panelOpen = false,
  onTogglePanel,
}: VendorFiltersProps) {
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(filters);
  const panelId = useId();
  const activeFilterCount = countActiveDiscoveryFilters(draftFilters);
  const isFloating = variant === "mobileFloating" || variant === "desktopFloating";
  const floatingClassName =
    variant === "mobileFloating"
      ? "discovery-filters discovery-filters-mobile"
      : "discovery-filters discovery-filters-desktop";

  function clearFilters() {
    setDraftFilters(defaultFilters);
    onChange(defaultFilters);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = readFormFilters(event.currentTarget);

    trackPublicUserAction({
      event_type: "filter_applied",
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/",
      location_source: locationSource ?? null,
      filters: nextFilters,
      metadata: {},
    });

    if (nextFilters.search.length > 0) {
      trackPublicUserAction({
        event_type: "search_used",
        page_path:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/",
        location_source: locationSource ?? null,
        search_query: nextFilters.search,
        filters: nextFilters,
        metadata: {},
      });
    }

    onChange(nextFilters);
  }

  return (
    <form
      className={isFloating ? floatingClassName : "discovery-filters"}
      onSubmit={submitFilters}
    >
      {isFloating ? (
        <>
          <div
            className={
              variant === "mobileFloating"
                ? "discovery-mobile-search-row"
                : "discovery-desktop-search-row"
            }
          >
            <label className="field search-field search-field-mobile">
              <span className="filter-field-label-hidden">Search</span>
              <input
                aria-label="Search"
                value={draftFilters.search}
                name="search"
                placeholder="Vendor, dish, or area"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </label>
            <button
              aria-controls={panelId}
              aria-expanded={panelOpen}
              aria-label={panelOpen ? "Close filters" : "Open filters"}
              className="discovery-filter-toggle"
              type="button"
              onClick={onTogglePanel}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 5h14" strokeLinecap="round" />
                <path d="M6 10h8" strokeLinecap="round" />
                <path d="M8 15h4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div
            id={panelId}
            className={
              variant === "mobileFloating"
                ? "discovery-mobile-filter-panel"
                : "discovery-desktop-filter-panel"
            }
            data-open={panelOpen ? "true" : "false"}
          >
            <div className="discovery-filters-summary discovery-filters-summary-mobile">
              <strong>Filters</strong>
              <span>
                {activeFilterCount > 0
                  ? `${activeFilterCount} active`
                  : "Search by vendor, dish, or area"}
              </span>
              {activeFilterCount > 0 ? (
                <button
                  className="button-secondary compact-button discovery-clear-button"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="discovery-mobile-filter-grid">
              <label className="field">
                <span>Radius</span>
                <select
                  value={draftFilters.radiusKm}
                  name="radiusKm"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      radiusKm: Number(event.target.value),
                    }))
                  }
                >
                  {radiusOptions.map((radius) => (
                    <option key={radius} value={radius}>
                      {radius} km
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Price</span>
                <select
                  value={draftFilters.priceBand}
                  name="priceBand"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      priceBand: event.target.value as DiscoveryFilters["priceBand"],
                    }))
                  }
                >
                  <option value="">Any</option>
                  {priceBands.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Category</span>
              <select
                value={draftFilters.category}
                disabled={categories.length === 0}
                name="category"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option value="">Any</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-field filter-checkbox filter-checkbox-mobile">
              <input
                checked={draftFilters.openNow}
                name="openNow"
                type="checkbox"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    openNow: event.target.checked,
                  }))
                }
              />
              <span>Open now</span>
            </label>
            <button className="button-primary compact-button discovery-mobile-apply" type="submit">
              Apply
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="discovery-filters-summary">
            <strong>Filters</strong>
            <span>
              {activeFilterCount > 0
                ? `${activeFilterCount} active`
                : "Search by vendor, dish, or area"}
            </span>
            {activeFilterCount > 0 ? (
              <button
                className="button-secondary compact-button discovery-clear-button"
                type="button"
                onClick={clearFilters}
              >
                Clear
              </button>
            ) : null}
          </div>
          <label className="field search-field">
            <span>Search</span>
            <input
              value={draftFilters.search}
              name="search"
              placeholder="Vendor, dish, or area"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>Radius</span>
            <select
              value={draftFilters.radiusKm}
              name="radiusKm"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  radiusKm: Number(event.target.value),
                }))
              }
            >
              {radiusOptions.map((radius) => (
                <option key={radius} value={radius}>
                  {radius} km
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Price</span>
            <select
              value={draftFilters.priceBand}
              name="priceBand"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  priceBand: event.target.value as DiscoveryFilters["priceBand"],
                }))
              }
            >
              <option value="">Any</option>
              {priceBands.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={draftFilters.category}
              disabled={categories.length === 0}
              name="category"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            >
              <option value="">Any</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field filter-checkbox">
            <input
              checked={draftFilters.openNow}
              name="openNow"
              type="checkbox"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  openNow: event.target.checked,
                }))
              }
            />
            <span>Open now</span>
          </label>
          <button className="button-primary compact-button" type="submit">
            Apply
          </button>
        </>
      )}
    </form>
  );
}
