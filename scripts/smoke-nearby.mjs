import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFiles = [".env.local", ".env"];

for (const envFile of envFiles) {
  const path = resolve(process.cwd(), envFile);

  if (!existsSync(path)) continue;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const lat = Number(process.env.SMOKE_NEARBY_LAT ?? "9.0765");
const lng = Number(process.env.SMOKE_NEARBY_LNG ?? "7.3986");
const radiusKm = Number(process.env.SMOKE_NEARBY_RADIUS_KM ?? "30");

if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) {
  throw new Error("Smoke test coordinates and radius must be finite numbers.");
}

function buildNearbyUrl(params) {
  const url = new URL("/api/vendors/nearby", appUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function fetchNearby(params) {
  const url = buildNearbyUrl(params);
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  return {
    url,
    response,
    body,
  };
}

function assertSuccessResult(label, result, { requireVendors }) {
  if (!result.response.ok) {
    throw new Error(
      `${label} failed with HTTP ${result.response.status}: ${JSON.stringify(result.body)}`,
    );
  }

  if (!result.body?.success || !Array.isArray(result.body.data?.vendors)) {
    throw new Error(`${label} returned an invalid API shape: ${JSON.stringify(result.body)}`);
  }

  if (requireVendors && result.body.data.vendors.length === 0) {
    throw new Error(`${label} returned no vendors: ${result.url.toString()}`);
  }

  for (const vendor of result.body.data.vendors) {
    const requiredFields = [
      "vendor_id",
      "name",
      "latitude",
      "longitude",
      "distance_km",
      "is_open_now",
    ];

    for (const field of requiredFields) {
      if (!(field in vendor)) {
        throw new Error(`${label} vendor is missing required field: ${field}`);
      }
    }

    if (typeof vendor.distance_km !== "number" || vendor.distance_km < 0) {
      throw new Error(`${label} vendor has invalid distance_km: ${JSON.stringify(vendor)}`);
    }
  }

  const distances = result.body.data.vendors.map((vendor) => vendor.distance_km);
  const sortedDistances = [...distances].sort((left, right) => left - right);

  if (JSON.stringify(distances) !== JSON.stringify(sortedDistances)) {
    throw new Error(`${label} vendors are not sorted nearest first.`);
  }
}

function assertAllWithinRadius(label, result, maxRadiusKm) {
  for (const vendor of result.body.data.vendors) {
    if (vendor.distance_km > maxRadiusKm) {
      throw new Error(
        `${label} returned vendor outside radius ${maxRadiusKm}: ${JSON.stringify(vendor)}`,
      );
    }
  }
}

async function assertValidationError(label, params) {
  const result = await fetchNearby(params);

  if (result.response.status !== 400 || result.body?.error?.code !== "VALIDATION_ERROR") {
    throw new Error(
      `${label} should return VALIDATION_ERROR 400: ${JSON.stringify(result.body)}`,
    );
  }

  return {
    label,
    checkedUrl: result.url.toString(),
    status: result.response.status,
    code: result.body.error.code,
  };
}

const preciseResult = await fetchNearby({
  lat,
  lng,
  location_source: "precise",
  radius_km: radiusKm,
});
assertSuccessResult("precise nearby query", preciseResult, { requireVendors: true });
assertAllWithinRadius("precise nearby query", preciseResult, radiusKm);

const tightRadiusKm = Number(process.env.SMOKE_NEARBY_TIGHT_RADIUS_KM ?? "1");
const tightRadiusResult = await fetchNearby({
  lat,
  lng,
  location_source: "precise",
  radius_km: tightRadiusKm,
});
assertSuccessResult("tight radius nearby query", tightRadiusResult, { requireVendors: false });
assertAllWithinRadius("tight radius nearby query", tightRadiusResult, tightRadiusKm);

if (tightRadiusResult.body.data.vendors.length > preciseResult.body.data.vendors.length) {
  throw new Error("Tight radius query returned more vendors than the wider nearby query.");
}

const fallbackResult = await fetchNearby({});
assertSuccessResult("Abuja fallback nearby query", fallbackResult, { requireVendors: true });

if (fallbackResult.body.data.location?.source !== "default_city") {
  throw new Error(
    `Fallback query should use default_city: ${JSON.stringify(fallbackResult.body.data.location)}`,
  );
}

const invalidCoordinateResult = await assertValidationError("invalid coordinate query", {
  lat: 120,
  lng,
});
const partialCoordinateResult = await assertValidationError("partial coordinate query", {
  lat,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        {
          label: "precise nearby query",
          checkedUrl: preciseResult.url.toString(),
          vendorCount: preciseResult.body.data.vendors.length,
          nearestVendor: preciseResult.body.data.vendors[0],
        },
        {
          label: "tight radius nearby query",
          checkedUrl: tightRadiusResult.url.toString(),
          vendorCount: tightRadiusResult.body.data.vendors.length,
        },
        {
          label: "Abuja fallback nearby query",
          checkedUrl: fallbackResult.url.toString(),
          location: fallbackResult.body.data.location,
          vendorCount: fallbackResult.body.data.vendors.length,
        },
        invalidCoordinateResult,
        partialCoordinateResult,
      ],
    },
    null,
    2,
  ),
);
