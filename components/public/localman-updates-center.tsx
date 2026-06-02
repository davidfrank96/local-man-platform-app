"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";
import type { LocalmanUpdate } from "../../lib/public/localman-updates.ts";
import { useModalFocusTrap } from "./use-modal-focus-trap.ts";

type LocalmanUpdatesCenterProps = {
  open: boolean;
  updates: readonly LocalmanUpdate[];
  onClose: () => void;
};

const priorityLabels: Record<LocalmanUpdate["priority"], string> = {
  guidance: "Guidance",
  info: "Info",
  safety: "Safety",
};

function formatPublishDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function LocalmanUpdatesCenter({
  open,
  updates,
  onClose,
}: LocalmanUpdatesCenterProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useModalFocusTrap({
    active: open,
    containerRef: panelRef,
    onEscape: onClose,
  });

  if (!open) {
    return null;
  }

  function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="localman-updates-overlay"
      data-testid="localman-updates-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        aria-labelledby="localman-updates-title"
        aria-modal="true"
        className="localman-updates-panel"
        data-testid="localman-updates-panel"
        id="localman-updates-panel"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="localman-updates-header">
          <div>
            <p className="eyebrow">Updates</p>
            <h2 id="localman-updates-title">Localman Updates</h2>
          </div>
          <button
            aria-label="Close Localman updates"
            className="localman-updates-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="localman-updates-list">
          {updates.length > 0 ? (
            updates.map((update) => (
              <article className="localman-update-card" key={update.id}>
                <div className="localman-update-card-meta">
                  <span>{priorityLabels[update.priority]}</span>
                  <time dateTime={update.publishDate}>{formatPublishDate(update.publishDate)}</time>
                </div>
                <h3>{update.title}</h3>
                <p>{update.body}</p>
              </article>
            ))
          ) : (
            <div className="localman-update-card localman-update-card-empty" role="status">
              <h3>No active updates</h3>
              <p>Check back later for Localman notes and guidance.</p>
            </div>
          )}
        </div>

        <button
          className="localman-updates-dismiss"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </section>
    </div>
  );
}
