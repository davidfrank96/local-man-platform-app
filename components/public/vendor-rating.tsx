"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { AppErrorCode } from "../../lib/api/contracts.ts";
import { AppError } from "../../lib/errors/app-error.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import {
  getRatingSignalPromptForScore,
  type RatingSignalSlug,
} from "../../lib/ratings/signals.ts";
import { formatVendorCardRating } from "../../lib/vendors/card-display.ts";
import { useModalFocusTrap } from "./use-modal-focus-trap.ts";

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
  const promptRef = useRef<HTMLElement | null>(null);
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
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<RatingSignalSlug[]>([]);
  const hasRated = hasStoredRating || hasRatedFromSubmission;
  const ratingPrompt =
    pendingScore === null ? null : getRatingSignalPromptForScore(pendingScore);
  const status =
    statusOverride ??
    (hasRated
      ? "You've already rated this vendor."
      : "Tap a star to rate this vendor.");

  function beginRating(score: number) {
    if (hasRated) {
      setStatusOverride("You've already rated this vendor.");
      return;
    }

    setPendingScore(score);
    setSelectedSignals([]);
    setStatusOverride("Choose up to 2 tags, or skip.");
  }

  function toggleSignal(signal: RatingSignalSlug) {
    setSelectedSignals((currentSignals) => {
      if (currentSignals.includes(signal)) {
        return currentSignals.filter((currentSignal) => currentSignal !== signal);
      }

      if (currentSignals.length >= 2) {
        return currentSignals;
      }

      return [...currentSignals, signal];
    });
  }

  function closePrompt() {
    if (isSubmitting) {
      return;
    }

    setPendingScore(null);
    setSelectedSignals([]);
    setStatusOverride(null);
  }

  async function submitRating(score: number, signals: RatingSignalSlug[] = []) {
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
        body: JSON.stringify({ score, signals }),
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
        setPendingScore(null);
        setSelectedSignals([]);
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
      setPendingScore(null);
      setSelectedSignals([]);
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
  const promptTitleId = "vendor-rating-prompt-title";

  useModalFocusTrap({
    active: pendingScore !== null && ratingPrompt !== null,
    containerRef: promptRef,
    escapeDisabled: isSubmitting,
    onEscape: closePrompt,
  });

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
            onClick={() => beginRating(score)}
          >
            {score}★
          </button>
        ))}
      </div>
      <p className="vendor-rating-status" aria-live="polite">
        {status}
      </p>
      {pendingScore !== null && ratingPrompt ? (
        <div className="vendor-rating-prompt-backdrop">
          <section
            aria-labelledby={promptTitleId}
            aria-modal="true"
            className="vendor-rating-prompt"
            ref={promptRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="vendor-rating-prompt-header">
              <div>
                <p>Optional tags for {pendingScore}★</p>
                <h3 id={promptTitleId}>{ratingPrompt.title}</h3>
              </div>
              <button
                aria-label="Close rating prompt"
                className="vendor-rating-prompt-close"
                disabled={isSubmitting}
                onClick={closePrompt}
                type="button"
              >
                x
              </button>
            </div>
            <p className="vendor-rating-prompt-copy">
              Choose up to 2 quick tags. No text box is needed.
            </p>
            <div className="vendor-rating-signal-list" role="group" aria-label="Rating tags">
              {ratingPrompt.options.map((option) => {
                const isSelected = selectedSignals.includes(option.slug);
                const isDisabled =
                  isSubmitting || (!isSelected && selectedSignals.length >= 2);

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`vendor-rating-signal${isSelected ? " is-selected" : ""}`}
                    disabled={isDisabled}
                    key={option.slug}
                    onClick={() => toggleSignal(option.slug)}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="vendor-rating-prompt-actions">
              <button
                className="vendor-rating-prompt-secondary"
                disabled={isSubmitting}
                onClick={() => void submitRating(pendingScore, [])}
                type="button"
              >
                Skip
              </button>
              <button
                className="vendor-rating-prompt-primary"
                disabled={isSubmitting}
                onClick={() => void submitRating(pendingScore, selectedSignals)}
                type="button"
              >
                {isSubmitting ? "Saving…" : "Submit rating"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
