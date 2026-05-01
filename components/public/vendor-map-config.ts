export const MAP_FALLBACK_NOTICE =
  "Map view limited, vendors still available below.";

export function getPublicMapStyleUrl(envValue = process.env.NEXT_PUBLIC_MAP_STYLE_URL): string {
  return envValue?.trim() ?? "";
}

export function browserSupportsVendorMapRendering(): boolean {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.WebGLRenderingContext === "undefined"
  ) {
    return false;
  }

  const canvas = document.createElement("canvas");

  try {
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}
