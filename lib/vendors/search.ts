export const MAX_PUBLIC_SEARCH_LENGTH = 100;

export type SearchMatchFieldKind =
  | "name"
  | "dish"
  | "category"
  | "slug"
  | "description"
  | "area";

export type SearchMatchField = {
  kind: SearchMatchFieldKind;
  value: string | null | undefined;
};

const fieldScores: Record<SearchMatchFieldKind, {
  exact: number;
  startsWith: number;
  contains: number;
}> = {
  name: { exact: 10_000, startsWith: 8_000, contains: 6_000 },
  dish: { exact: 9_000, startsWith: 7_000, contains: 5_000 },
  category: { exact: 9_000, startsWith: 7_000, contains: 5_000 },
  slug: { exact: 8_500, startsWith: 6_500, contains: 4_500 },
  description: { exact: 4_000, startsWith: 3_500, contains: 3_000 },
  area: { exact: 3_500, startsWith: 3_000, contains: 2_000 },
};

export function sanitizePublicSearchInput(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().replace(/\s+/g, " ").slice(0, MAX_PUBLIC_SEARCH_LENGTH);
}

export function normalizeSearchText(input: string | null | undefined): string {
  return sanitizePublicSearchInput(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function scoreField(
  field: SearchMatchField,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  const normalizedValue = normalizeSearchText(field.value);

  if (!normalizedValue) {
    return 0;
  }

  const scores = fieldScores[field.kind];

  if (normalizedValue === normalizedQuery) {
    return scores.exact;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return scores.startsWith;
  }

  if (
    normalizedValue.includes(normalizedQuery) ||
    queryTokens.every((token) => normalizedValue.includes(token))
  ) {
    return scores.contains;
  }

  return 0;
}

export function getSearchRelevanceScore(
  query: string | null | undefined,
  fields: SearchMatchField[],
): number {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  let bestScore = 0;

  for (const field of fields) {
    bestScore = Math.max(bestScore, scoreField(field, normalizedQuery, queryTokens));
  }

  return bestScore;
}
