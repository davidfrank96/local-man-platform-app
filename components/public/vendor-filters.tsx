import { useState, type FormEvent } from "react";
import type { PriceBand } from "../../types/index.ts";
import type { PublicCategory } from "../../lib/vendors/public-api-client.ts";

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
  onChange: (filters: DiscoveryFilters) => void;
};

const radiusOptions = [1, 5, 10, 30];
const priceBands: PriceBand[] = ["budget", "standard", "premium"];

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
  onChange,
}: VendorFiltersProps) {
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(filters);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange(readFormFilters(event.currentTarget));
  }

  return (
    <form className="discovery-filters" onSubmit={submitFilters}>
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
    </form>
  );
}
