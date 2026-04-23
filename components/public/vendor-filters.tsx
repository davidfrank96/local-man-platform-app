import type { FormEvent } from "react";
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
  disabled: boolean;
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
  disabled,
  onChange,
}: VendorFiltersProps) {
  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange(readFormFilters(event.currentTarget));
  }

  return (
    <form className="discovery-filters" onSubmit={submitFilters}>
      <label className="field search-field">
        <span>Search</span>
        <input
          defaultValue={filters.search}
          name="search"
          placeholder="Vendor, dish, or area"
        />
      </label>
      <label className="field">
        <span>Radius</span>
        <select defaultValue={filters.radiusKm} name="radiusKm">
          {radiusOptions.map((radius) => (
            <option key={radius} value={radius}>
              {radius} km
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Price</span>
        <select defaultValue={filters.priceBand} name="priceBand">
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
        <select defaultValue={filters.category} disabled={categories.length === 0} name="category">
          <option value="">Any</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-field filter-checkbox">
        <input defaultChecked={filters.openNow} name="openNow" type="checkbox" />
        <span>Open now</span>
      </label>
      <button className="button-primary compact-button" disabled={disabled} type="submit">
        Apply
      </button>
    </form>
  );
}
