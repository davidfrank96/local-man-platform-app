import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { LocationSource, PriceBand } from "../../types/index.ts";
import {
  sanitizePublicSearchInput,
  type PublicCategory,
} from "../../lib/vendors/public-api-client.ts";
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
  onChange: (filters: DiscoveryFilters, options?: { keepPanelsOpen?: boolean }) => void;
  variant?: "default" | "mobileFloating" | "desktopFloating";
  panelOpen?: boolean;
  onTogglePanel?: () => void;
};

const radiusOptions = [1, 5, 10, 30];
const priceBands: PriceBand[] = ["budget", "standard", "premium"];
const SEARCH_APPLY_DEBOUNCE_MS = 250;
const defaultFilters: DiscoveryFilters = {
  search: "",
  radiusKm: 10,
  openNow: false,
  priceBand: "",
  category: "",
};

type FilterIconName =
  | "category"
  | "chevron"
  | "clock"
  | "close"
  | "price"
  | "radius"
  | "reset"
  | "sliders";

function FilterIcon({ name }: { name: FilterIconName }) {
  switch (name) {
    case "category":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3.5" y="3.5" width="4.8" height="4.8" rx="1" />
          <rect x="11.7" y="3.5" width="4.8" height="4.8" rx="1" />
          <rect x="3.5" y="11.7" width="4.8" height="4.8" rx="1" />
          <rect x="11.7" y="11.7" width="4.8" height="4.8" rx="1" />
        </svg>
      );
    case "chevron":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" />
          <path d="M10 6.6v3.8l2.7 1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
        </svg>
      );
    case "price":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3.8 4.8v5.4l6.9 6.9 5.4-5.4-6.9-6.9H3.8Z" strokeLinejoin="round" />
          <circle cx="7.1" cy="8.1" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "radius":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 17s5.5-5.2 5.5-9.5a5.5 5.5 0 1 0-11 0C4.5 11.8 10 17 10 17Z" strokeLinejoin="round" />
          <circle cx="10" cy="7.5" r="1.8" />
        </svg>
      );
    case "reset":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 5.4A6.5 6.5 0 1 1 3.8 13" strokeLinecap="round" />
          <path d="M4.6 2.8v3.4h3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "sliders":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 5h4.5M12.5 5H17M3 10h8M16 10h1M3 15h2.5M10.5 15H17" strokeLinecap="round" />
          <circle cx="10" cy="5" r="2.1" />
          <circle cx="13.5" cy="10" r="2.1" />
          <circle cx="8" cy="15" r="2.1" />
        </svg>
      );
  }
}

function formatActiveFilterCount(count: number) {
  return `${count} active`;
}

function formatPriceBandLabel(band: PriceBand) {
  return band.charAt(0).toUpperCase() + band.slice(1);
}

function readFormFilters(form: HTMLFormElement): DiscoveryFilters {
  const formData = new FormData(form);

  return {
    search: sanitizePublicSearchInput(String(formData.get("search") ?? "")),
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
  const filtersStateKey = JSON.stringify(filters);
  const [draftState, setDraftState] = useState<{
    filters: DiscoveryFilters;
    key: string;
  }>(() => ({
    filters,
    key: filtersStateKey,
  }));
  const draftFilters = draftState.key === filtersStateKey ? draftState.filters : filters;
  const searchApplyTimeoutRef = useRef<number | null>(null);
  const draftFiltersRef = useRef<DiscoveryFilters>(draftFilters);
  const panelId = useId();
  const activeFilterCount = countActiveDiscoveryFilters(draftFilters);
  const isFloating = variant === "mobileFloating" || variant === "desktopFloating";
  const isMobileFloating = variant === "mobileFloating";
  const floatingClassName =
    variant === "mobileFloating"
      ? "discovery-filters discovery-filters-mobile"
      : "discovery-filters discovery-filters-desktop";

  useEffect(() => {
    return () => {
      if (searchApplyTimeoutRef.current !== null) {
        window.clearTimeout(searchApplyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    draftFiltersRef.current = draftFilters;
  }, [draftFilters]);

  function clearPendingSearchApply() {
    if (searchApplyTimeoutRef.current !== null) {
      window.clearTimeout(searchApplyTimeoutRef.current);
      searchApplyTimeoutRef.current = null;
    }
  }

  function setDraftFilters(nextFilters: DiscoveryFilters) {
    draftFiltersRef.current = nextFilters;
    setDraftState({
      filters: nextFilters,
      key: filtersStateKey,
    });
  }

  function updateDraftFilters(
    updater: (current: DiscoveryFilters) => DiscoveryFilters,
  ) {
    clearPendingSearchApply();
    setDraftFilters(updater(draftFilters));
  }

  function trackAppliedSearch(nextFilters: DiscoveryFilters) {
    if (nextFilters.search.length === 0) {
      return;
    }

    trackPublicUserAction({
      event_type: "search_used",
      page_path:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/",
      location_source: locationSource ?? null,
      search_query: nextFilters.search,
      filters: nextFilters,
      metadata: { source: "typed_search" },
    });
  }

  function applySearchFilters(nextDraftFilters: DiscoveryFilters, immediate: boolean) {
    const nextFilters = {
      ...nextDraftFilters,
      search: sanitizePublicSearchInput(nextDraftFilters.search),
    };

    clearPendingSearchApply();

    if (immediate || nextFilters.search.length === 0) {
      onChange(nextFilters, { keepPanelsOpen: true });
      if (nextFilters.search.length > 0) {
        trackAppliedSearch(nextFilters);
      }
      return;
    }

    searchApplyTimeoutRef.current = window.setTimeout(() => {
      searchApplyTimeoutRef.current = null;
      const latestFilters = {
        ...draftFiltersRef.current,
        search: sanitizePublicSearchInput(draftFiltersRef.current.search),
      };

      onChange(latestFilters, { keepPanelsOpen: true });
      trackAppliedSearch(latestFilters);
    }, SEARCH_APPLY_DEBOUNCE_MS);
  }

  function updateSearchDraft(value: string) {
    const nextFilters = {
      ...draftFilters,
      search: value,
    };

    setDraftFilters(nextFilters);
    applySearchFilters(nextFilters, value.trim().length === 0);
  }

  function clearFilters() {
    clearPendingSearchApply();
    setDraftFilters(defaultFilters);
    onChange(defaultFilters);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearPendingSearchApply();
    const nextFilters = readFormFilters(event.currentTarget);
    setDraftFilters(nextFilters);

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

  const filterPanel = (
    <div className="filter-panel-shell">
      <div className="filter-panel-header">
        {isMobileFloating ? (
          <button
            aria-label="Close filters"
            className="filter-panel-close"
            type="button"
            onClick={onTogglePanel}
          >
            <FilterIcon name="close" />
          </button>
        ) : null}
        <div className="filter-panel-title-group">
          {!isMobileFloating ? (
            <span className="filter-panel-title-icon">
              <FilterIcon name="sliders" />
            </span>
          ) : null}
          <div className="filter-panel-title-copy">
            <strong>Filters</strong>
            <span className="filter-active-pill">{formatActiveFilterCount(activeFilterCount)}</span>
          </div>
        </div>
        <button
          className="filter-clear-all"
          disabled={activeFilterCount === 0}
          type="button"
          onClick={clearFilters}
        >
          <FilterIcon name="reset" />
          <span>Clear all</span>
        </button>
      </div>

      <div className="filter-panel-body">
        <div className="filter-field-grid">
          <label className="filter-select-field">
            <span className="filter-control-label">
              <FilterIcon name="radius" />
              <span>Radius</span>
            </span>
            <span className="filter-select-shell">
              <span className="filter-select-icon">
                <FilterIcon name="radius" />
              </span>
              <select
                value={draftFilters.radiusKm}
                name="radiusKm"
                onChange={(event) =>
                  updateDraftFilters((current) => ({
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
              <span className="filter-select-chevron">
                <FilterIcon name="chevron" />
              </span>
            </span>
          </label>

          <label className="filter-select-field">
            <span className="filter-control-label">
              <FilterIcon name="price" />
              <span>Price</span>
            </span>
            <span className="filter-select-shell">
              <span className="filter-select-icon">
                <FilterIcon name="price" />
              </span>
              <select
                value={draftFilters.priceBand}
                name="priceBand"
                onChange={(event) =>
                  updateDraftFilters((current) => ({
                    ...current,
                    priceBand: event.target.value as DiscoveryFilters["priceBand"],
                  }))
                }
              >
                <option value="">Any</option>
                {priceBands.map((band) => (
                  <option key={band} value={band}>
                    {formatPriceBandLabel(band)}
                  </option>
                ))}
              </select>
              <span className="filter-select-chevron">
                <FilterIcon name="chevron" />
              </span>
            </span>
          </label>
        </div>

        <label className="filter-select-field filter-select-field-full">
          <span className="filter-control-label">
            <FilterIcon name="category" />
            <span>Category</span>
          </span>
          <span className="filter-select-shell">
            <span className="filter-select-icon">
              <FilterIcon name="category" />
            </span>
            <select
              value={draftFilters.category}
              disabled={categories.length === 0}
              name="category"
              onChange={(event) =>
                updateDraftFilters((current) => ({
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
            <span className="filter-select-chevron">
              <FilterIcon name="chevron" />
            </span>
          </span>
        </label>

        <label className="filter-open-card">
          <input
            checked={draftFilters.openNow}
            name="openNow"
            type="checkbox"
            onChange={(event) =>
              updateDraftFilters((current) => ({
                ...current,
                openNow: event.target.checked,
              }))
            }
          />
          <span className="filter-open-copy">
            <strong>Open now</strong>
            <span>Show only vendors that are open now</span>
          </span>
          <span className="filter-open-icon">
            <FilterIcon name="clock" />
          </span>
        </label>

        <button className="filter-apply-button" type="submit">
          <FilterIcon name="sliders" />
          <span>Apply filters</span>
        </button>
      </div>
    </div>
  );

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
                onChange={(event) => updateSearchDraft(event.target.value)}
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
            {filterPanel}
          </div>
        </>
      ) : (
        <>
          {filterPanel}
          <label className="field search-field">
            <span>Search</span>
            <input
              value={draftFilters.search}
              name="search"
              placeholder="Vendor, dish, or area"
              onChange={(event) => updateSearchDraft(event.target.value)}
            />
          </label>
        </>
      )}
    </form>
  );
}
