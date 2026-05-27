export const AUTOMATED_TEST_MARKER_PREFIX = "PLAYWRIGHT_";
export const AUTOMATED_QA_E2E_PREFIX = "QA_E2E_";
export const LEGACY_QA_ADMIN_VENDOR_PREFIX = "QA Admin Vendor";
export const AUTOMATED_QA_ADMIN_VENDOR_PREFIX = "QA Admin Vendor ";
export const AUTOMATED_QA_TEST_VENDOR_PREFIX = "QA_TEST_PLAYWRIGHT_";
export const AUTOMATED_ADMIN_EMAIL_PREFIX = "qa_admin_playwright_";
export const AUTOMATED_AGENT_EMAIL_PREFIX = "qa_agent_playwright_";
export const AUTOMATED_TEST_EMAIL_DOMAIN = "example.test";

const automatedVendorNamePrefixes = [
  LEGACY_QA_ADMIN_VENDOR_PREFIX,
  AUTOMATED_QA_E2E_PREFIX,
  AUTOMATED_TEST_MARKER_PREFIX,
  "QA_TEST_",
];

export const AUTOMATED_VENDOR_NAME_QUERY_PATTERNS = automatedVendorNamePrefixes.map(
  (prefix) => `${prefix}%`,
);

export function matchesQaAdminArtifactVendorName(
  name: string | null | undefined,
): boolean {
  if (typeof name !== "string") {
    return false;
  }

  const normalized = name.trim();

  return normalized.startsWith(LEGACY_QA_ADMIN_VENDOR_PREFIX)
    || normalized.startsWith(AUTOMATED_QA_E2E_PREFIX)
    || normalized.startsWith(AUTOMATED_TEST_MARKER_PREFIX);
}

export function matchesAutomatedTestVendorName(
  name: string | null | undefined,
): boolean {
  if (typeof name !== "string") {
    return false;
  }

  const normalized = name.trim();

  return normalized.startsWith(AUTOMATED_QA_TEST_VENDOR_PREFIX)
    || normalized.startsWith("QA_TEST_")
    || normalized.startsWith(AUTOMATED_QA_E2E_PREFIX)
    || normalized.startsWith(AUTOMATED_TEST_MARKER_PREFIX);
}

export function matchesAutomatedTestEmail(
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
    domain !== AUTOMATED_TEST_EMAIL_DOMAIN
    && domain !== "example.com"
    && domain !== "example.test"
    && domain !== "test.com"
  ) {
    return false;
  }

  return localPart.startsWith(AUTOMATED_ADMIN_EMAIL_PREFIX)
    || localPart.startsWith(AUTOMATED_AGENT_EMAIL_PREFIX)
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
