import type { VendorImage } from "../../types/index.ts";

type VendorImageTransformOptions = {
  width: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain";
};

type VendorResponsiveImageSources = {
  src: string;
  srcSet: string | null;
};

const SUPABASE_VENDOR_IMAGE_PUBLIC_PREFIX = "/storage/v1/object/public/vendor-images/";
const SUPABASE_VENDOR_IMAGE_RENDER_PREFIX = "/storage/v1/render/image/public/vendor-images/";

function normalizeTransformDimension(value: number | undefined): number | null {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.trunc(value));
}

export function isSeedPlaceholderUrl(imageUrl: string): boolean {
  return imageUrl.startsWith("/seed-images/");
}

export function buildVendorImagePublicUrl(baseUrl: string, storageObjectPath: string): string {
  return new URL(
    `/storage/v1/object/public/vendor-images/${storageObjectPath}`,
    baseUrl,
  ).toString();
}

export function normalizeVendorImageRow(
  baseUrl: string,
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const storageObjectPath =
    typeof row.storage_object_path === "string" && row.storage_object_path.trim().length > 0
      ? row.storage_object_path.trim()
      : null;

  if (!storageObjectPath) {
    return null;
  }

  return {
    ...row,
    image_url: buildVendorImagePublicUrl(baseUrl, storageObjectPath),
    storage_object_path: storageObjectPath,
  };
}

export function normalizeVendorImageRows(baseUrl: string, payload: unknown): unknown {
  if (!Array.isArray(payload)) {
    return payload;
  }

  return payload.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [row];
    }

    const normalizedRow = normalizeVendorImageRow(
      baseUrl,
      row as Record<string, unknown>,
    );

    return normalizedRow ? [normalizedRow] : [];
  });
}

export function buildVendorImageTransformUrl(
  imageUrl: string,
  storageObjectPath: string | null | undefined,
  options: VendorImageTransformOptions,
): string {
  if (!storageObjectPath) {
    return imageUrl;
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const expectedPublicPath = `${SUPABASE_VENDOR_IMAGE_PUBLIC_PREFIX}${storageObjectPath}`;

    if (parsedUrl.pathname !== expectedPublicPath) {
      return imageUrl;
    }

    const renderUrl = new URL(
      `${SUPABASE_VENDOR_IMAGE_RENDER_PREFIX}${storageObjectPath}`,
      parsedUrl.origin,
    );
    const width = normalizeTransformDimension(options.width);
    const height = normalizeTransformDimension(options.height);
    const quality = normalizeTransformDimension(options.quality);

    if (width !== null) {
      renderUrl.searchParams.set("width", String(width));
    }

    if (height !== null) {
      renderUrl.searchParams.set("height", String(height));
    }

    if (quality !== null) {
      renderUrl.searchParams.set("quality", String(quality));
    }

    if (options.resize) {
      renderUrl.searchParams.set("resize", options.resize);
    }

    return renderUrl.toString();
  } catch {
    return imageUrl;
  }
}

export function buildVendorResponsiveImageSources(
  imageUrl: string,
  storageObjectPath: string | null | undefined,
  widths: readonly number[],
  options: Omit<VendorImageTransformOptions, "width"> = {},
): VendorResponsiveImageSources {
  const normalizedWidths = [...new Set(widths.map((width) => Math.max(1, Math.trunc(width))))]
    .filter((width) => Number.isFinite(width))
    .sort((left, right) => left - right);

  if (!storageObjectPath || normalizedWidths.length === 0) {
    return {
      src: imageUrl,
      srcSet: null,
    };
  }

  const srcSet = normalizedWidths
    .map((width) => {
      const candidateUrl = buildVendorImageTransformUrl(imageUrl, storageObjectPath, {
        ...options,
        width,
      });

      return candidateUrl === imageUrl ? null : `${candidateUrl} ${width}w`;
    })
    .filter((candidate): candidate is string => candidate !== null);

  if (srcSet.length === 0) {
    return {
      src: imageUrl,
      srcSet: null,
    };
  }

  const defaultWidth = normalizedWidths[Math.min(1, normalizedWidths.length - 1)]!;

  return {
    src: buildVendorImageTransformUrl(imageUrl, storageObjectPath, {
      ...options,
      width: defaultWidth,
    }),
    srcSet: srcSet.join(", "),
  };
}

export function selectPrimaryVendorImage(images: VendorImage[]): VendorImage | null {
  return images.find((image) => !isSeedPlaceholderUrl(image.image_url)) ?? images[0] ?? null;
}
