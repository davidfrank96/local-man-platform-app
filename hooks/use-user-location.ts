"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acquireUserLocation,
  getBrowserGeolocation,
  getIpApproximation,
  type AcquiredUserLocation,
  type BrowserGeolocationProvider,
  type IpApproximationProvider,
  type LocationAcquisitionError,
  type LocationAcquisitionStatus,
} from "@/lib/location/acquisition";

export type UseUserLocationOptions = {
  auto?: boolean;
  browserGeolocation?: BrowserGeolocationProvider;
  ipApproximation?: IpApproximationProvider;
};

export type UseUserLocationResult = {
  status: LocationAcquisitionStatus;
  location: AcquiredUserLocation | null;
  errors: LocationAcquisitionError[];
  refresh: () => Promise<AcquiredUserLocation>;
};

export function useUserLocation({
  auto = true,
  browserGeolocation = getBrowserGeolocation,
  ipApproximation = getIpApproximation,
}: UseUserLocationOptions = {}): UseUserLocationResult {
  const [status, setStatus] = useState<LocationAcquisitionStatus>("idle");
  const [location, setLocation] = useState<AcquiredUserLocation | null>(null);
  const [errors, setErrors] = useState<LocationAcquisitionError[]>([]);

  const refresh = useCallback(async () => {
    setStatus("resolving");

    try {
      const nextLocation = await acquireUserLocation({
        browserGeolocation,
        ipApproximation,
      });

      setLocation(nextLocation);
      setErrors(nextLocation.errors);
      setStatus("resolved");

      return nextLocation;
    } catch (error) {
      const nextError: LocationAcquisitionError = {
        code: "UNKNOWN",
        message:
          error instanceof Error ? error.message : "Unable to acquire location.",
      };

      setErrors([nextError]);
      setStatus("error");
      throw error;
    }
  }, [browserGeolocation, ipApproximation]);

  useEffect(() => {
    if (!auto) return;

    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [auto, refresh]);

  return {
    status,
    location,
    errors,
    refresh,
  };
}
