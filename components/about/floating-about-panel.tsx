"use client";

import { useEffect, useRef, useState } from "react";

import { AboutLocalmanContent } from "./about-localman-content.tsx";

type FloatingAboutPanelProps = {
  supportEmail: string;
  websiteUrl: string;
};

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M10 8.6v5M10 6.1h.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function FloatingAboutPanel({
  supportEmail,
  websiteUrl,
}: FloatingAboutPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div
      className="desktop-floating-about"
      data-testid="desktop-floating-about"
      ref={rootRef}
    >
      {isOpen ? (
        <div
          aria-label="About LocalMan"
          className="desktop-floating-about-panel"
          data-testid="desktop-floating-about-panel"
          id="desktop-about-panel"
          ref={panelRef}
          tabIndex={-1}
        >
          <AboutLocalmanContent
            className="desktop-about-view"
            idPrefix="desktop-about"
            rootTestId="desktop-about-view"
            supportEmail={supportEmail}
            testIdPrefix="desktop-about"
            titleId="desktop-about-title"
            websiteUrl={websiteUrl}
          />
        </div>
      ) : null}
      <button
        aria-controls="desktop-about-panel"
        aria-expanded={isOpen}
        className="desktop-floating-about-button"
        data-testid="desktop-floating-about-button"
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <InfoIcon />
        <span>About LocalMan</span>
        <ChevronIcon />
      </button>
    </div>
  );
}
