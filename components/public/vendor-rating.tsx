"use client";

import { useState, useSyncExternalStore } from "react";
import type { AppErrorCode } from "../../lib/api/contracts.ts";
import { AppError } from "../../lib/errors/app-error.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
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

type RatingApiPayload = {
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
    detail?: string;
    details?: {
      vendor_id?: string;
      duplicate?: boolean;
      rating_summary?: {
        average_rating: number;
        review_count: number;
      };
    };
  } | null;
};

const ratedVendorsStorageKey = "localman:rated-vendors:v1";
const ratedVendorsUpdatedEvent = "localman:rated-vendors-updated";

function formatRatingCount(reviewCount: number): string {
  return reviewCount === 1 ? "1 rating" : `${reviewCount} ratings`;
}

function getRatedVendorKey(vendorId: string): string {
  return `vendor:${vendorId}`;
}

function readRatedVendors(): Record<string, true> {
  try {
    const raw = window.localStorage.getItem(ratedVendorsStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, true>
      : {};
  } catch {
    return {};
  }
}

function hasRatedVendor(vendorId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return readRatedVendors()[getRatedVendorKey(vendorId)] === true;
}

function markVendorRated(vendorId: string): void {
  try {
    const ratedVendors = readRatedVendors();
    ratedVendors[getRatedVendorKey(vendorId)] = true;
    window.localStorage.setItem(ratedVendorsStorageKey, JSON.stringify(ratedVendors));
    window.dispatchEvent(new Event(ratedVendorsUpdatedEvent));
  } catch {
    // Server-side duplicate protection remains authoritative.
  }
}

function subscribeToRatedVendors(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ratedVendorsUpdatedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ratedVendorsUpdatedEvent, onStoreChange);
  };
}

function getServerRatedVendorSnapshot(): boolean {
  return false;
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
  const hasStoredRating = useSyncExternalStore(
    subscribeToRatedVendors,
    () => hasRatedVendor(vendorId),
    getServerRatedVendorSnapshot,
  );
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRatedFromSubmission, setHasRatedFromSubmission] = useState(false);
  const hasRated = hasStoredRating || hasRatedFromSubmission;
  const status =
    statusOverride ??
    (hasRated
      ? "You've already rated this vendor."
      : "Tap a star to rate this vendor.");

  async function submitRating(score: number) {
    if (hasRated) {
      setStatusOverride("You've already rated this vendor.");
      return;
    }

    setIsSubmitting(true);
    setStatusOverride("Saving rating…");

    try {
      const response = await fetch(`/api/vendors/${vendorSlug}/ratings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ score }),
      });
      const payload = (await response.json()) as RatingApiPayload;

      if (
        response.status === 409 &&
        payload.error?.details?.duplicate === true &&
        payload.error.details.vendor_id === vendorId
      ) {
        const duplicateSummary = payload.error.details.rating_summary;

        if (duplicateSummary) {
          setSummary({
            averageRating: duplicateSummary.average_rating,
            reviewCount: duplicateSummary.review_count,
          });
        }

        markVendorRated(vendorId);
        setHasRatedFromSubmission(true);
        setStatusOverride(payload.error.message ?? "You've already rated this vendor.");
        return;
      }

      if (!response.ok || !payload.success || payload.data?.vendor_id !== vendorId) {
        const errorCode = (payload.error?.code ?? "UPSTREAM_ERROR") as AppErrorCode;
        const errorMessage = payload.error?.message ?? "Unable to save vendor rating.";
        throw new AppError(
          errorCode,
          errorMessage,
          response.status,
          undefined,
          payload.error?.detail,
        );
      }

      setSummary({
        averageRating: payload.data.rating_summary.average_rating,
        reviewCount: payload.data.rating_summary.review_count,
      });
      markVendorRated(vendorId);
      setHasRatedFromSubmission(true);
      setStatusOverride("Rating saved. Thanks for helping other customers.");
    } catch (error) {
      setStatusOverride(
        handleAppError(error, {
          fallbackMessage: "Unable to save vendor rating.",
          role: "user",
          context: "vendor_rating_submit",
        }).message,
      );
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
            disabled={isSubmitting || hasRated}
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
