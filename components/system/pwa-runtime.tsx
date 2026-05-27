"use client";

import { useEffect } from "react";

const PWA_RUNTIME_VERSION = "2026-05-pwa-runtime-v2";
const PWA_UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

type LocalmanPwaRuntimeState = {
  lastUpdateCheckAt: string | null;
  version: string;
};

function canRegisterServiceWorker(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const { hostname, protocol } = window.location;

  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
}

function exposePwaRuntimeState(lastUpdateCheckAt: string | null) {
  const runtimeWindow = window as typeof window & {
    __LOCALMAN_PWA_RUNTIME__?: LocalmanPwaRuntimeState;
  };

  runtimeWindow.__LOCALMAN_PWA_RUNTIME__ = {
    lastUpdateCheckAt,
    version: PWA_RUNTIME_VERSION,
  };
  document.documentElement.dataset.localmanPwaRuntime = PWA_RUNTIME_VERSION;
}

export function PwaRuntime() {
  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    let isDisposed = false;
    let lastUpdateCheckMs = 0;
    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdates = () => {
      if (!registration || isDisposed) {
        return;
      }

      const now = Date.now();

      if (now - lastUpdateCheckMs < PWA_UPDATE_CHECK_INTERVAL_MS) {
        return;
      }

      lastUpdateCheckMs = now;
      exposePwaRuntimeState(new Date(now).toISOString());
      registration.update().catch(() => {
        // Update checks should never interrupt Localman runtime behavior.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    const register = () => {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).then((nextRegistration) => {
        if (isDisposed) {
          return;
        }

        registration = nextRegistration;
        exposePwaRuntimeState(null);
        checkForUpdates();
        window.addEventListener("focus", checkForUpdates);
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }).catch(() => {
        // Installability should not interrupt Localman runtime behavior.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      isDisposed = true;
      window.removeEventListener("load", register);
      window.removeEventListener("focus", checkForUpdates);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
