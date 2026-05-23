"use client";

import { useState, useSyncExternalStore } from "react";
import {
  buildVendorShareUrl,
  getVendorNativeShareData,
} from "../../lib/vendors/share.ts";

type VendorShareActionsProps = {
  vendorName: string;
  vendorSlug: string;
};

type ShareFeedback = "copied" | "failed" | null;

function ShareActionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="vendor-action-icon"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.6 3.7 5.4 6.5" />
      <path d="M5.4 9.5 10.6 12.3" />
      <path d="M4.1 8a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0Z" />
      <path d="M14.2 2.6a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0Z" />
      <path d="M14.2 13.4a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0Z" />
    </svg>
  );
}

function CopyActionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="vendor-action-icon"
      focusable="false"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.2 5.2h6.6v8H5.2z" />
      <path d="M3.1 10.8H2.8c-.5 0-.9-.4-.9-.9V2.8c0-.5.4-.9.9-.9h7.1c.5 0 .9.4.9.9v.3" />
    </svg>
  );
}

function copyWithFallback(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";

  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyWithFallback(text);
    }
  }

  return copyWithFallback(text);
}

function getBrowserOrigin(): string | null {
  return typeof window === "undefined" ? null : window.location.origin;
}

function getServerOrigin(): null {
  return null;
}

function subscribeToBrowserOrigin(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timer = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(timer);
}

function safelyBuildVendorShareUrl(origin: string | null, vendorSlug: string): string | null {
  if (!origin) {
    return null;
  }

  try {
    return buildVendorShareUrl({ origin, vendorSlug });
  } catch {
    return null;
  }
}

export function VendorShareActions({ vendorName, vendorSlug }: VendorShareActionsProps) {
  const [feedback, setFeedback] = useState<ShareFeedback>(null);
  const origin = useSyncExternalStore(
    subscribeToBrowserOrigin,
    getBrowserOrigin,
    getServerOrigin,
  );
  const shareUrl = safelyBuildVendorShareUrl(origin, vendorSlug);

  function getCurrentShareUrl(): string | null {
    if (shareUrl) {
      return shareUrl;
    }

    return safelyBuildVendorShareUrl(getBrowserOrigin(), vendorSlug);
  }

  async function copyVendorLink() {
    const vendorUrl = getCurrentShareUrl();
    if (!vendorUrl) {
      setFeedback("failed");
      return false;
    }

    const didCopy = await copyTextToClipboard(vendorUrl);
    setFeedback(didCopy ? "copied" : "failed");
    return didCopy;
  }

  async function handleNativeShare() {
    const currentOrigin = origin ?? getBrowserOrigin();
    if (!currentOrigin) {
      setFeedback("failed");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share(
          getVendorNativeShareData({
            vendorName,
            vendorSlug,
            origin: currentOrigin,
          }),
        );
        setFeedback(null);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyVendorLink();
  }

  const feedbackMessage =
    feedback === "copied"
      ? "Vendor link copied."
      : feedback === "failed"
        ? "Could not copy the vendor link."
        : "";

  return (
    <div className="vendor-share-block" aria-label="Share vendor profile">
      <div className="vendor-share-actions">
        <button
          className="button-secondary compact-button vendor-action-button"
          type="button"
          onClick={handleNativeShare}
        >
          <ShareActionIcon />
          Share link
        </button>
        <button
          className="button-secondary compact-button vendor-action-button vendor-copy-link-button"
          type="button"
          onClick={() => {
            void copyVendorLink();
          }}
        >
          <CopyActionIcon />
          Copy link
        </button>
      </div>
      <p className="vendor-share-feedback" role="status" aria-live="polite">
        {feedbackMessage}
      </p>
    </div>
  );
}
