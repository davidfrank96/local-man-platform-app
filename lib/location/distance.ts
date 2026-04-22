export type Coordinates = {
  lat: number;
  lng: number;
};

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function normalizeLongitude(longitude: number): number {
  if (longitude < -180) return longitude + 360;
  if (longitude > 180) return longitude - 360;
  return longitude;
}

export function calculateDistanceKm(
  from: Coordinates,
  to: Coordinates,
): number {
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function roundDistanceKm(distanceKm: number): number {
  return Math.round(distanceKm * 100) / 100;
}

export function getBoundingBox(
  center: Coordinates,
  radiusKm: number,
): BoundingBox {
  const latDelta = toDegrees(radiusKm / EARTH_RADIUS_KM);
  const latRadians = toRadians(center.lat);
  const lngDelta =
    Math.abs(Math.cos(latRadians)) < 0.000001
      ? 180
      : toDegrees(radiusKm / (EARTH_RADIUS_KM * Math.cos(latRadians)));

  return {
    minLat: Math.max(-90, center.lat - latDelta),
    maxLat: Math.min(90, center.lat + latDelta),
    minLng: normalizeLongitude(center.lng - lngDelta),
    maxLng: normalizeLongitude(center.lng + lngDelta),
  };
}
