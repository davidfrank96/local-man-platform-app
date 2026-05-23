import { slugPattern } from "../validation/common.ts";

export type VendorShareDetails = {
  vendorName: string;
  vendorSlug: string;
  origin: string;
};

export type VendorNativeShareData = {
  title: string;
  text: string;
  url: string;
};

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    throw new Error("Invalid share origin.");
  }
}

function normalizeVendorName(vendorName: string): string {
  const normalized = vendorName.trim().replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : "this vendor";
}

export function buildVendorShareUrl({
  origin,
  vendorSlug,
}: Pick<VendorShareDetails, "origin" | "vendorSlug">): string {
  if (!slugPattern.test(vendorSlug)) {
    throw new Error("Invalid vendor slug.");
  }

  return new URL(`/vendors/${vendorSlug}`, normalizeOrigin(origin)).toString();
}

export function buildVendorShareMessage(vendorName: string, vendorUrl: string): string {
  const displayName = normalizeVendorName(vendorName);

  return `Check out ${displayName} on Localman: ${vendorUrl}`;
}

export function buildVendorWhatsAppShareUrl({
  vendorName,
  vendorUrl,
}: {
  vendorName: string;
  vendorUrl: string;
}): string {
  const url = new URL("https://wa.me/");
  url.searchParams.set("text", buildVendorShareMessage(vendorName, vendorUrl));

  return url.toString();
}

export function getVendorNativeShareData({
  vendorName,
  vendorSlug,
  origin,
}: VendorShareDetails): VendorNativeShareData {
  const vendorUrl = buildVendorShareUrl({ origin, vendorSlug });
  const displayName = normalizeVendorName(vendorName);

  return {
    title: `${displayName} on Localman`,
    text: buildVendorShareMessage(displayName, vendorUrl),
    url: vendorUrl,
  };
}
