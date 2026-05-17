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
  const panelId = useId();
  const activeFilterCount = countActiveDiscoveryFilters(draftFilters);
  const isFloating = variant === "mobileFloating" || variant === "desktopFloating";
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

  function clearPendingSearchApply() {
    if (searchApplyTimeoutRef.current !== null) {
      window.clearTimeout(searchApplyTimeoutRef.current);
      searchApplyTimeoutRef.current = null;
    }
  }

  function setDraftFilters(nextFilters: DiscoveryFilters) {
    setDraftState({
      filters: nextFilters,
      key: filtersStateKey,
    });
  }

  function updateDraftFilters(
    updater: (current: DiscoveryFilters) => DiscoveryFilters,
  ) {
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
      onChange(nextFilters, { keepPanelsOpen: true });
      trackAppliedSearch(nextFilters);
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
              </label>
              <label className="field">
                <span>Price</span>
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
            </label>
            <label className="checkbox-field filter-checkbox filter-checkbox-mobile">
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
              onChange={(event) => updateSearchDraft(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Radius</span>
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
          </label>
          <label className="field">
            <span>Price</span>
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
          </label>
          <label className="checkbox-field filter-checkbox">
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
