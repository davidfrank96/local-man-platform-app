export const PLAYWRIGHT_MARKER_PREFIX = "PLAYWRIGHT_";
export const PLAYWRIGHT_QA_E2E_PREFIX = "QA_E2E_";
export const LEGACY_QA_ADMIN_VENDOR_PREFIX = "QA Admin Vendor";
export const PLAYWRIGHT_QA_ADMIN_VENDOR_PREFIX = "QA Admin Vendor ";
export const PLAYWRIGHT_QA_TEST_VENDOR_PREFIX = "QA_TEST_PLAYWRIGHT_";
export const PLAYWRIGHT_ADMIN_EMAIL_PREFIX = "qa_admin_playwright_";
export const PLAYWRIGHT_AGENT_EMAIL_PREFIX = "qa_agent_playwright_";
export const PLAYWRIGHT_TEST_EMAIL_DOMAIN = "example.test";

const playwightQueryNamePrefixes = [
  LEGACY_QA_ADMIN_VENDOR_PREFIX,
  PLAYWRIGHT_QA_E2E_PREFIX,
  PLAYWRIGHT_MARKER_PREFIX,
  "QA_TEST_",
];

export const PLAYWRIGHT_VENDOR_NAME_QUERY_PATTERNS = playwightQueryNamePrefixes.map(
  (prefix) => `${prefix}%`,
);

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
  if (typeof name !== "string") {
    return false;
  }

  const normalized = name.trim();

  return normalized.startsWith(LEGACY_QA_ADMIN_VENDOR_PREFIX)
    || normalized.startsWith(PLAYWRIGHT_QA_E2E_PREFIX)
    || normalized.startsWith(PLAYWRIGHT_MARKER_PREFIX);
}

export function matchesPlaywrightTestVendorName(
  name: string | null | undefined,
): boolean {
  if (typeof name !== "string") {
    return false;
  }

  const normalized = name.trim();

  return normalized.startsWith(PLAYWRIGHT_QA_TEST_VENDOR_PREFIX)
    || normalized.startsWith("QA_TEST_")
    || normalized.startsWith(PLAYWRIGHT_QA_E2E_PREFIX)
    || normalized.startsWith(PLAYWRIGHT_MARKER_PREFIX);
}

export function matchesPlaywrightTestEmail(
  email: string | null | undefined,
): boolean {
  if (typeof email !== "string") {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");

  if (atIndex <= 0) {
    return false;
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (
    domain !== PLAYWRIGHT_TEST_EMAIL_DOMAIN
    && domain !== "example.com"
    && domain !== "example.test"
    && domain !== "test.com"
  ) {
    return false;
  }

  return localPart.startsWith(PLAYWRIGHT_ADMIN_EMAIL_PREFIX)
    || localPart.startsWith(PLAYWRIGHT_AGENT_EMAIL_PREFIX)
    || localPart.startsWith("qa_admin_")
    || localPart.startsWith("qa_test_")
    || localPart.startsWith("playwright")
    || localPart.startsWith("e2e");
}

export function isDestructiveVendorInvalidationReason(
  reason: string | null | undefined,
): boolean {
  if (typeof reason !== "string") {
    return false;
  }

  return /deactivat|delet|cleanup/i.test(reason);
}
