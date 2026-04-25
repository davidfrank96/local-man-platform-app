export type ReverseGeocodeAddress = Partial<{
  neighbourhood: string;
  suburb: string;
  borough: string;
  city_district: string;
  residential: string;
  village: string;
  town: string;
  city: string;
  municipality: string;
  county: string;
  state: string;
  country: string;
}>;

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function formatReverseGeocodeLabel(
  address: ReverseGeocodeAddress | null | undefined,
): string | null {
  if (!address) {
    return null;
  }

  const area = firstNonEmpty([
    address.neighbourhood,
    address.suburb,
    address.borough,
    address.city_district,
    address.residential,
    address.village,
  ]);
  const city = firstNonEmpty([
    address.city,
    address.town,
    address.municipality,
  ]);
  const broader = firstNonEmpty([
    city,
    address.county,
    address.state,
  ]);
  const country = firstNonEmpty([address.country]);

  if (area && broader && area !== broader) {
    return `${area}, ${broader}`;
  }

  if (broader && country && broader !== country) {
    return `${broader}, ${country}`;
  }

  return area ?? broader ?? country;
}
