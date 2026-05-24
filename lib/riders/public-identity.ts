const PUBLIC_PLATE_VISIBLE_CHARACTERS = 4;
const PUBLIC_PLATE_MINIMUM_MASKED_CHARACTERS = 2;

export function getRiderPublicFirstName(displayName: string | null | undefined): string {
  const trimmedName = String(displayName ?? "").trim();
  const firstName = trimmedName.split(/\s+/)[0]?.trim();

  return firstName && firstName.length > 0 ? firstName : "Rider";
}

export function maskRiderPlateNumber(plateNumber: string | null | undefined): string | null {
  const normalizedPlate = String(plateNumber ?? "")
    .trim()
    .toUpperCase()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, "");

  if (!normalizedPlate) {
    return null;
  }

  const alphanumericCharacters = normalizedPlate.replace(/[^A-Z0-9]/g, "");
  const visibleLimit = Math.min(
    PUBLIC_PLATE_VISIBLE_CHARACTERS,
    Math.max(1, alphanumericCharacters.length - PUBLIC_PLATE_MINIMUM_MASKED_CHARACTERS),
  );

  if (visibleLimit < 1) {
    return "***";
  }

  let visibleCharacterCount = 0;
  let visiblePrefix = "";

  for (const character of normalizedPlate) {
    if (/[A-Z0-9]/.test(character)) {
      if (visibleCharacterCount >= visibleLimit) {
        break;
      }

      visibleCharacterCount += 1;
      visiblePrefix += character;
      continue;
    }

    if (visibleCharacterCount > 0 && visibleCharacterCount < visibleLimit) {
      visiblePrefix += character;
    }
  }

  const trimmedPrefix = visiblePrefix.replace(/[-\s]+$/g, "");

  return trimmedPrefix ? `${trimmedPrefix}-***` : "***";
}
