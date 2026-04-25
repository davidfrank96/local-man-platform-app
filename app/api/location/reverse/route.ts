import { NextResponse } from "next/server";
import { formatReverseGeocodeLabel } from "../../../../lib/location/reverse-geocode.ts";

const REVERSE_GEOCODE_TIMEOUT_MS = 2_500;

function parseCoordinate(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"));
  const lng = parseCoordinate(searchParams.get("lng"));

  if (lat === null || lng === null) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INVALID_COORDINATES",
          message: "Latitude and longitude are required.",
        },
      },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=13&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "accept-language": request.headers.get("accept-language") ?? "en",
          "user-agent": "The Local Man / reverse-geocode",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      address?: Record<string, string>;
    };

    return NextResponse.json({
      success: true,
      data: {
        label: formatReverseGeocodeLabel(payload.address),
      },
      error: null,
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        label: null,
      },
      error: null,
    });
  } finally {
    clearTimeout(timeout);
  }
}

