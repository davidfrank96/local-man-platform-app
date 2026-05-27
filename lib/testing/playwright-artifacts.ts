import {
  AUTOMATED_ADMIN_EMAIL_PREFIX,
  AUTOMATED_AGENT_EMAIL_PREFIX,
  AUTOMATED_QA_ADMIN_VENDOR_PREFIX,
  AUTOMATED_QA_E2E_PREFIX,
  AUTOMATED_QA_TEST_VENDOR_PREFIX,
  AUTOMATED_TEST_EMAIL_DOMAIN,
  AUTOMATED_TEST_MARKER_PREFIX,
  AUTOMATED_VENDOR_NAME_QUERY_PATTERNS,
  LEGACY_QA_ADMIN_VENDOR_PREFIX,
  isDestructiveVendorInvalidationReason as isDestructiveVendorInvalidationReasonRule,
  matchesAutomatedTestEmail,
  matchesAutomatedTestVendorName,
  matchesQaAdminArtifactVendorName,
} from "../runtime-artifact-rules.ts";

export const PLAYWRIGHT_MARKER_PREFIX = AUTOMATED_TEST_MARKER_PREFIX;
export const PLAYWRIGHT_QA_E2E_PREFIX = AUTOMATED_QA_E2E_PREFIX;
export { LEGACY_QA_ADMIN_VENDOR_PREFIX };
export const PLAYWRIGHT_QA_ADMIN_VENDOR_PREFIX = AUTOMATED_QA_ADMIN_VENDOR_PREFIX;
export const PLAYWRIGHT_QA_TEST_VENDOR_PREFIX = AUTOMATED_QA_TEST_VENDOR_PREFIX;
export const PLAYWRIGHT_ADMIN_EMAIL_PREFIX = AUTOMATED_ADMIN_EMAIL_PREFIX;
export const PLAYWRIGHT_AGENT_EMAIL_PREFIX = AUTOMATED_AGENT_EMAIL_PREFIX;
export const PLAYWRIGHT_TEST_EMAIL_DOMAIN = AUTOMATED_TEST_EMAIL_DOMAIN;
export const PLAYWRIGHT_VENDOR_NAME_QUERY_PATTERNS = AUTOMATED_VENDOR_NAME_QUERY_PATTERNS;

export function sanitizePlaywrightArtifactSegment(
  value: string,
  maxLength = 32,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export function formatPlaywrightArtifactTimestamp(
  timestamp = new Date(),
): string {
  return timestamp
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function createPlaywrightArtifactMarker(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
}): string {
  const suffix = sanitizePlaywrightArtifactSegment(options?.title ?? "artifact");

  return [
    PLAYWRIGHT_MARKER_PREFIX,
    formatPlaywrightArtifactTimestamp(options?.timestamp),
    `_W${options?.workerIndex ?? 0}`,
    `_R${options?.retry ?? 0}`,
    suffix ? `_${suffix}` : "",
  ].join("");
}

function createPlaywrightIdentitySuffix(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
}) {
  return [
    formatPlaywrightArtifactTimestamp(options?.timestamp).toLowerCase(),
    `w${options?.workerIndex ?? 0}`,
    `r${options?.retry ?? 0}`,
    sanitizePlaywrightArtifactSegment(options?.title ?? "artifact", 24),
  ].join("-");
}

export function createPlaywrightVendorIdentity(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
}) {
  const marker = createPlaywrightArtifactMarker(options);
  const slugSuffix = createPlaywrightIdentitySuffix(options);

  return {
    marker,
    name: `${PLAYWRIGHT_QA_ADMIN_VENDOR_PREFIX}${marker}`,
    slug: `qa-admin-vendor-playwright-${slugSuffix}`,
  };
}

export function createPlaywrightAdminIdentity(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
}) {
  const marker = createPlaywrightArtifactMarker(options);
  const slugSuffix = createPlaywrightIdentitySuffix(options);

  return {
    marker,
    email: `${PLAYWRIGHT_ADMIN_EMAIL_PREFIX}${slugSuffix}@${PLAYWRIGHT_TEST_EMAIL_DOMAIN}`,
    fullName: `${marker} Admin`,
  };
}

export function createPlaywrightAgentIdentity(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
}) {
  const marker = createPlaywrightArtifactMarker(options);
  const slugSuffix = createPlaywrightIdentitySuffix(options);

  return {
    marker,
    email: `${PLAYWRIGHT_AGENT_EMAIL_PREFIX}${slugSuffix}@${PLAYWRIGHT_TEST_EMAIL_DOMAIN}`,
    fullName: `${marker} Agent`,
  };
}

export function createPlaywrightRatingComment(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
}): string {
  return `${PLAYWRIGHT_QA_E2E_PREFIX}${createPlaywrightArtifactMarker(options)} rating`;
}

export function createPlaywrightImageFileName(options?: {
  title?: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
  extension?: "jpg" | "jpeg" | "png" | "webp";
}): string {
  const extension = options?.extension ?? "png";
  const marker = sanitizePlaywrightArtifactSegment(
    createPlaywrightArtifactMarker(options),
    96,
  );

  return `${marker}.${extension}`;
}

export function matchesPlaywrightQaAdminVendorName(
  name: string | null | undefined,
): boolean {
  return matchesQaAdminArtifactVendorName(name);
}

export function matchesPlaywrightTestVendorName(
  name: string | null | undefined,
): boolean {
  return matchesAutomatedTestVendorName(name);
}

export function matchesPlaywrightTestEmail(
  email: string | null | undefined,
): boolean {
  return matchesAutomatedTestEmail(email);
}

export function isDestructiveVendorInvalidationReason(
  reason: string | null | undefined,
): boolean {
  return isDestructiveVendorInvalidationReasonRule(reason);
}
