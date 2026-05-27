"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isFocusableElement(element: HTMLElement): boolean {
  if (element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(isFocusableElement);
}

type UseModalFocusTrapOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  escapeDisabled?: boolean;
  onEscape: () => void;
};

export function useModalFocusTrap({
  active,
  containerRef,
  escapeDisabled = false,
  onEscape,
}: UseModalFocusTrapOptions): void {
  const onEscapeRef = useRef(onEscape);
  const escapeDisabledRef = useRef(escapeDisabled);

  useEffect(() => {
    onEscapeRef.current = onEscape;
    escapeDisabledRef.current = escapeDisabled;
  }, [escapeDisabled, onEscape]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const modalContainer = container;
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const animationFrame = window.requestAnimationFrame(() => {
      const [firstFocusableElement] = getFocusableElements(modalContainer);
      (firstFocusableElement ?? modalContainer).focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (escapeDisabledRef.current) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(modalContainer);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalContainer.focus({ preventScroll: true });
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        !(activeElement instanceof Node) ||
        !modalContainer.contains(activeElement)
      ) {
        event.preventDefault();
        firstFocusableElement.focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus({ preventScroll: true });
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown, true);

      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}
