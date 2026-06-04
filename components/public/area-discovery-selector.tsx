"use client";

import { useId, type RefObject } from "react";
import {
  DISCOVERY_AREAS,
  parseStoredDiscoveryAreaId,
  type DiscoveryAreaId,
} from "../../lib/location/discovery-areas.ts";

type AreaDiscoverySelectorProps = {
  controlRef?: RefObject<HTMLSelectElement | null>;
  disabled?: boolean;
  helperText?: string;
  label?: string;
  onAreaChange: (areaId: DiscoveryAreaId | null) => void;
  selectedAreaId: DiscoveryAreaId | null;
};

export function AreaDiscoverySelector({
  controlRef,
  disabled = false,
  helperText = "Choose an area to use when precise location is unavailable.",
  label = "Discovery area",
  onAreaChange,
  selectedAreaId,
}: AreaDiscoverySelectorProps) {
  const fieldId = useId();
  const helperId = `${fieldId}-helper`;

  return (
    <div className="area-discovery-selector">
      <label className="area-discovery-selector-label" htmlFor={fieldId}>
        {label}
      </label>
      <select
        aria-describedby={helperId}
        className="area-discovery-selector-control"
        disabled={disabled}
        id={fieldId}
        onChange={(event) => onAreaChange(parseStoredDiscoveryAreaId(event.target.value))}
        ref={controlRef}
        value={selectedAreaId ?? ""}
      >
        <option value="">Select an area</option>
        {DISCOVERY_AREAS.map((area) => (
          <option key={area.id} value={area.id}>
            {area.displayName}
          </option>
        ))}
      </select>
      <p className="area-discovery-selector-helper" id={helperId}>
        {helperText}
      </p>
    </div>
  );
}
