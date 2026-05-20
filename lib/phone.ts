const removablePhoneCharactersPattern = /[\s().-]/g;
const nigerianCanonicalPhonePattern = /^234\d{10}$/;
const nigerianLocalPhonePattern = /^0\d{10}$/;

function cleanPhoneInput(input: string): string | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed.replace(removablePhoneCharactersPattern, "").replace(/^\+/, "");
}

export function normalizeNigerianPhoneNumber(input: string): string | null {
  const cleaned = cleanPhoneInput(input);

  if (!cleaned) {
    return null;
  }

  if (nigerianCanonicalPhonePattern.test(cleaned)) {
    return cleaned;
  }

  if (nigerianLocalPhonePattern.test(cleaned)) {
    return `234${cleaned.slice(1)}`;
  }

  return null;
}

export function isNigerianPhoneNumber(input: string): boolean {
  return normalizeNigerianPhoneNumber(input) !== null;
}

export function getNigerianPhoneStorageVariants(input: string): string[] {
  const normalized = normalizeNigerianPhoneNumber(input);

  if (!normalized) {
    return [];
  }

  const local = `0${normalized.slice(3)}`;

  return [normalized, `+${normalized}`, local];
}

export function formatNigerianPhoneForDisplay(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeNigerianPhoneNumber(input);

  return normalized ? `+${normalized}` : null;
}

export function getNigerianPhoneTelHref(input: string | null | undefined): string | null {
  const displayPhone = formatNigerianPhoneForDisplay(input);

  return displayPhone ? `tel:${displayPhone}` : null;
}
