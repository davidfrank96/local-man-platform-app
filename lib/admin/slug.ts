import { slugPattern } from "../validation/common.ts";

export function slugifyVendorName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "vendor";
}

export function isValidVendorSlug(slug: string): boolean {
  return slugPattern.test(slug.trim());
}

export function getVendorSlugError(slug: string): string | null {
  const trimmedSlug = slug.trim();

  if (trimmedSlug.length === 0) {
    return "Slug is required.";
  }

  if (!isValidVendorSlug(trimmedSlug)) {
    return "Use lowercase words separated by hyphens.";
  }

  return null;
}
