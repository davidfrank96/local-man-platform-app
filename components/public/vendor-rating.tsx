"use client";

import { useState } from "react";
import { formatVendorCardRating } from "../../lib/vendors/card-display.ts";

type VendorRatingProps = {
  vendorId: string;
  vendorSlug: string;
  initialAverageRating: number;
  initialReviewCount: number;
};

type RatingState = {
  averageRating: number;
  reviewCount: number;
};

function formatRatingCount(reviewCount: number): string {
  return reviewCount === 1 ? "1 rating" : `${reviewCount} ratings`;
}

export function VendorRating({
  vendorId,
  vendorSlug,
  initialAverageRating,
  initialReviewCount,
}: VendorRatingProps) {
  const [summary, setSummary] = useState<RatingState>({
    averageRating: initialAverageRating,
    reviewCount: initialReviewCount,
  });
  const [status, setStatus] = useState("Tap a star to rate this vendor.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRating(score: number) {
    setIsSubmitting(true);
    setStatus("Saving rating…");

    try {
      const response = await fetch(`/api/vendors/${vendorSlug}/ratings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ score }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          vendor_id: string;
          rating_summary: {
            average_rating: number;
            review_count: number;
          };
        };
        error?: {
          code?: string;
          message?: string;
        } | null;
      };

      if (!response.ok || !payload.success || payload.data?.vendor_id !== vendorId) {
        const errorCode = payload.error?.code ?? "UPSTREAM_ERROR";
        const errorMessage = payload.error?.message ?? "Unable to save vendor rating.";
        throw new Error(`${errorCode}: ${errorMessage}`);
      }

      setSummary({
        averageRating: payload.data.rating_summary.average_rating,
        reviewCount: payload.data.rating_summary.review_count,
      });
      setStatus("Rating saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save vendor rating.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const summaryLabel = formatVendorCardRating(summary.averageRating, summary.reviewCount);
  const detailLabel =
    summary.reviewCount > 0
      ? `${summaryLabel} from ${formatRatingCount(summary.reviewCount)}`
      : "New vendor";

  return (
    <div className="vendor-rating-card">
      <div className="vendor-rating-summary">
        <strong>{summaryLabel}</strong>
        <span>{detailLabel}</span>
      </div>
      <div className="vendor-rating-actions" role="group" aria-label="Rate this vendor">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            className="vendor-rating-button"
            type="button"
            disabled={isSubmitting}
            aria-label={`Rate ${score} star${score === 1 ? "" : "s"}`}
            onClick={() => void submitRating(score)}
          >
            {score}★
          </button>
        ))}
      </div>
      <p className="vendor-rating-status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
