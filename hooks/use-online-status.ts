"use client";

import { useSyncExternalStore } from "react";
import {
  isBrowserOnline,
  subscribeToBrowserNetworkStatus,
} from "../lib/public/network-status.ts";

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToBrowserNetworkStatus,
    isBrowserOnline,
    () => true,
  );
}
