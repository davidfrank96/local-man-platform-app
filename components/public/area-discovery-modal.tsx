"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";
import {
  DISCOVERY_AREAS,
  type DiscoveryAreaId,
} from "../../lib/location/discovery-areas.ts";
import { useModalFocusTrap } from "./use-modal-focus-trap.ts";

type AreaDiscoveryModalProps = {
  open: boolean;
  selectedAreaId: DiscoveryAreaId | null;
  onAreaSelect: (areaId: DiscoveryAreaId) => void;
  onClose: () => void;
};

export const AREA_DISCOVERY_MODAL_ID = "area-discovery-modal";
const AREA_DISCOVERY_MODAL_TITLE_ID = "area-discovery-modal-title";

export function AreaDiscoveryModal({
  open,
  selectedAreaId,
  onAreaSelect,
  onClose,
}: AreaDiscoveryModalProps) {
  const modalRef = useRef<HTMLElement | null>(null);

  useModalFocusTrap({
    active: open,
    containerRef: modalRef,
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
      className="area-discovery-modal-overlay"
      data-testid="area-discovery-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        aria-labelledby={AREA_DISCOVERY_MODAL_TITLE_ID}
        aria-modal="true"
        className="area-discovery-modal"
        data-testid="area-discovery-modal"
        id={AREA_DISCOVERY_MODAL_ID}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="area-discovery-modal-header">
          <div>
            <p className="eyebrow">Discovery area</p>
            <h2 id={AREA_DISCOVERY_MODAL_TITLE_ID}>Browse by area</h2>
          </div>
          <button
            aria-label="Close area selector"
            className="area-discovery-modal-close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="area-discovery-modal-copy">
          Choose a Localman area to browse vendors when device location is unavailable.
        </p>

        <div
          aria-label="Localman discovery areas"
          className="area-discovery-modal-list"
          role="listbox"
        >
          {DISCOVERY_AREAS.map((area) => {
            const selected = area.id === selectedAreaId;

            return (
              <button
                aria-selected={selected}
                className="area-discovery-modal-option"
                key={area.id}
                role="option"
                type="button"
                onClick={() => onAreaSelect(area.id)}
              >
                <span>{area.displayName}</span>
                {selected ? <strong>Current</strong> : null}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
