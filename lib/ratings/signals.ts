export const positiveRatingSignalSlugs = [
  "good_food",
  "clean_vendor",
  "fair_price",
  "fast_service",
  "friendly_vendor",
  "easy_to_find",
] as const;

export const neutralRatingSignalSlugs = [
  "average_food",
  "slow_service",
  "price_could_be_better",
  "location_hard_to_find",
] as const;

export const negativeRatingSignalSlugs = [
  "poor_hygiene",
  "food_safety_concern",
  "rude_service",
  "price_issue",
  "vendor_unavailable",
  "wrong_location",
  "long_wait",
] as const;

export const ratingSignalSlugs = [
  ...positiveRatingSignalSlugs,
  ...neutralRatingSignalSlugs,
  ...negativeRatingSignalSlugs,
] as const;

export type RatingSignalSlug = (typeof ratingSignalSlugs)[number];
export type RatingSignalType = "positive" | "neutral" | "negative";

type RatingSignalDefinition = {
  label: string;
  signal_type: RatingSignalType;
  score_min: number;
  score_max: number;
  is_public_positive: boolean;
  sort_order: number;
};

export const ratingSignalDefinitionBySlug = {
  good_food: {
    label: "Good food",
    signal_type: "positive",
    score_min: 4,
    score_max: 5,
    is_public_positive: true,
    sort_order: 10,
  },
  clean_vendor: {
    label: "Clean vendor",
    signal_type: "positive",
    score_min: 4,
    score_max: 5,
    is_public_positive: true,
    sort_order: 20,
  },
  fair_price: {
    label: "Fair price",
    signal_type: "positive",
    score_min: 4,
    score_max: 5,
    is_public_positive: true,
    sort_order: 30,
  },
  fast_service: {
    label: "Fast service",
    signal_type: "positive",
    score_min: 4,
    score_max: 5,
    is_public_positive: true,
    sort_order: 40,
  },
  friendly_vendor: {
    label: "Friendly vendor",
    signal_type: "positive",
    score_min: 4,
    score_max: 5,
    is_public_positive: true,
    sort_order: 50,
  },
  easy_to_find: {
    label: "Easy to find",
    signal_type: "positive",
    score_min: 4,
    score_max: 5,
    is_public_positive: true,
    sort_order: 60,
  },
  average_food: {
    label: "Average food",
    signal_type: "neutral",
    score_min: 3,
    score_max: 3,
    is_public_positive: false,
    sort_order: 110,
  },
  slow_service: {
    label: "Slow service",
    signal_type: "neutral",
    score_min: 3,
    score_max: 3,
    is_public_positive: false,
    sort_order: 120,
  },
  price_could_be_better: {
    label: "Price could be better",
    signal_type: "neutral",
    score_min: 3,
    score_max: 3,
    is_public_positive: false,
    sort_order: 130,
  },
  location_hard_to_find: {
    label: "Hard to find",
    signal_type: "neutral",
    score_min: 3,
    score_max: 3,
    is_public_positive: false,
    sort_order: 140,
  },
  poor_hygiene: {
    label: "Poor hygiene",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 210,
  },
  food_safety_concern: {
    label: "Food safety concern",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 220,
  },
  rude_service: {
    label: "Rude service",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 230,
  },
  price_issue: {
    label: "Price issue",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 240,
  },
  vendor_unavailable: {
    label: "Vendor unavailable",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 250,
  },
  wrong_location: {
    label: "Wrong location",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 260,
  },
  long_wait: {
    label: "Long wait",
    signal_type: "negative",
    score_min: 1,
    score_max: 2,
    is_public_positive: false,
    sort_order: 270,
  },
} as const satisfies Record<RatingSignalSlug, RatingSignalDefinition>;

export const ratingSignalOptions = ratingSignalSlugs.map((slug) => ({
  slug,
  ...ratingSignalDefinitionBySlug[slug],
}));

export type RatingSignalOptionConfig = (typeof ratingSignalOptions)[number];

export function isRatingSignalAllowedForScore(
  score: number,
  slug: RatingSignalSlug,
) {
  const definition = ratingSignalDefinitionBySlug[slug];
  return score >= definition.score_min && score <= definition.score_max;
}

export function getRatingSignalPromptForScore(score: number): {
  title: string;
  options: RatingSignalOptionConfig[];
} | null {
  if (score >= 4 && score <= 5) {
    return {
      title: "What stood out?",
      options: ratingSignalOptions.filter((option) => option.signal_type === "positive"),
    };
  }

  if (score === 3) {
    return {
      title: "What could be better?",
      options: ratingSignalOptions.filter((option) => option.signal_type === "neutral"),
    };
  }

  if (score >= 1 && score <= 2) {
    return {
      title: "What went wrong?",
      options: ratingSignalOptions.filter((option) => option.signal_type === "negative"),
    };
  }

  return null;
}
