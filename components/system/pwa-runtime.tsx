"use client";

import { useEffect } from "react";

const PWA_RUNTIME_VERSION = "2026-05-pwa-runtime-v4";
const PWA_UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const PWA_RESUME_HEALTH_CHECK_IDLE_MS = 5 * 60 * 1000;
const PWA_RECOVERY_HEALTHY_CLEAR_MS = 7_000;
const PWA_RECOVERY_FALLBACK_ID = "localman-runtime-recovery";
const PWA_RECOVERY_RELOAD_KEY = `localman:pwa-recovery-reload:${PWA_RUNTIME_VERSION}`;

const RECOVERABLE_RUNTIME_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Loading CSS chunk [\w-]+ failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload CSS/i,
];

type LocalmanPwaRuntimeState = {
  lastUpdateCheckAt: string | null;
  lastRecoveryReason: string | null;
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

function exposePwaRuntimeState(
  lastUpdateCheckAt: string | null,
  lastRecoveryReason: string | null = null,
) {
  const runtimeWindow = window as typeof window & {
    __LOCALMAN_PWA_RUNTIME__?: LocalmanPwaRuntimeState;
  };

  runtimeWindow.__LOCALMAN_PWA_RUNTIME__ = {
    lastUpdateCheckAt,
    lastRecoveryReason,
    version: PWA_RUNTIME_VERSION,
  };
  document.documentElement.dataset.localmanPwaRuntime = PWA_RUNTIME_VERSION;
}

function readRuntimeErrorText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name} ${value.message}`;
  }

  if (typeof value === "object") {
    const errorLike = value as {
      error?: unknown;
      message?: unknown;
      reason?: unknown;
    };

    return [
      readRuntimeErrorText(errorLike.error),
      readRuntimeErrorText(errorLike.reason),
      typeof errorLike.message === "string" ? errorLike.message : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function isRecoverableRuntimeError(value: unknown): boolean {
  const message = readRuntimeErrorText(value);

  return RECOVERABLE_RUNTIME_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function hasAttemptedRecoveryReload(): boolean {
  try {
    return window.sessionStorage.getItem(PWA_RECOVERY_RELOAD_KEY) === PWA_RUNTIME_VERSION;
  } catch {
    return false;
  }
}

function markRecoveryReloadAttempt() {
  try {
    window.sessionStorage.setItem(PWA_RECOVERY_RELOAD_KEY, PWA_RUNTIME_VERSION);
  } catch {
    // Session storage can be unavailable in hardened browser modes.
  }
}

function clearRecoveryReloadAttempt() {
  try {
    window.sessionStorage.removeItem(PWA_RECOVERY_RELOAD_KEY);
  } catch {
    // Session storage can be unavailable in hardened browser modes.
  }
}

function hasCriticalUserFlowActive(): boolean {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    if (
      activeElement.matches("input, textarea, select, [contenteditable='true']") ||
      activeElement.closest("[role='dialog'], .rider-connect-modal")
    ) {
      return true;
    }
  }

  return Boolean(document.querySelector("[role='dialog'], .rider-connect-modal"));
}

function isAppShellBlank(): boolean {
  const body = document.body;

  if (!body || document.getElementById(PWA_RECOVERY_FALLBACK_ID)) {
    return false;
  }

  const mainContent = document.getElementById("main-content");
  const visibleText = (mainContent?.textContent ?? body.textContent ?? "").trim();

  return visibleText.length === 0 && body.children.length <= 1;
}

function showRuntimeRecoveryFallback(reason: string) {
  const body = document.body;

  if (!body || document.getElementById(PWA_RECOVERY_FALLBACK_ID)) {
    return;
  }

  document.documentElement.dataset.localmanRuntimeRecovery = reason;

  const fallback = document.createElement("div");
  fallback.id = PWA_RECOVERY_FALLBACK_ID;
  fallback.setAttribute("role", "alert");
  fallback.innerHTML = `
    <style>
      #${PWA_RECOVERY_FALLBACK_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        min-height: 100dvh;
        padding: 24px;
        background: #faf6f0;
        color: #111814;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #${PWA_RECOVERY_FALLBACK_ID} .localman-runtime-recovery-card {
        width: min(100%, 420px);
        border: 1px solid #e6e2d8;
        border-radius: 22px;
        background: #ffffff;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
        padding: 28px;
        text-align: center;
      }

      #${PWA_RECOVERY_FALLBACK_ID} img {
        display: block;
        width: 72px;
        height: 72px;
        margin: 0 auto 18px;
      }

      #${PWA_RECOVERY_FALLBACK_ID} h1 {
        margin: 0;
        font-size: 1.45rem;
        line-height: 1.2;
      }

      #${PWA_RECOVERY_FALLBACK_ID} p {
        margin: 12px 0 0;
        color: #4f5b53;
        font-size: 1rem;
        line-height: 1.55;
      }

      #${PWA_RECOVERY_FALLBACK_ID} button {
        display: inline-flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        margin-top: 22px;
        border: 0;
        border-radius: 999px;
        background: #13733d;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 0 20px;
      }
    </style>
    <div class="localman-runtime-recovery-card">
      <img src="/icons/pwa-192x192.png" alt="" width="72" height="72">
      <h1>Localman needs to reload to continue.</h1>
      <p>Your live marketplace data will refresh when the app reloads.</p>
      <button type="button">Reload Localman</button>
    </div>
  `;

  fallback.querySelector("button")?.addEventListener("click", () => {
    window.location.reload();
  });

  body.append(fallback);
}

export function PwaRuntime() {
  useEffect(() => {
    if (!canRegisterServiceWorker()) {
      return;
    }

    let isDisposed = false;
    let lastUpdateCheckMs = 0;
    let lastHiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;
    let pendingRecoveryReason: string | null = null;
    let registration: ServiceWorkerRegistration | null = null;
    const hadServiceWorkerControllerAtStartup = Boolean(navigator.serviceWorker.controller);

    const recoverRuntime = (reason: string, options: { deferIfActive?: boolean } = {}) => {
      if (isDisposed) {
        return;
      }

      exposePwaRuntimeState(null, reason);

      if (options.deferIfActive && hasCriticalUserFlowActive()) {
        pendingRecoveryReason = reason;
        return;
      }

      if (hasAttemptedRecoveryReload()) {
        showRuntimeRecoveryFallback(reason);
        return;
      }

      markRecoveryReloadAttempt();
      window.location.reload();
    };

    const clearRecoveryAttemptAfterHealthyLoad = () => {
      window.setTimeout(() => {
        if (isDisposed) {
          return;
        }

        if (!isAppShellBlank() && !document.getElementById(PWA_RECOVERY_FALLBACK_ID)) {
          clearRecoveryReloadAttempt();
        }
      }, PWA_RECOVERY_HEALTHY_CLEAR_MS);
    };

    const runRuntimeHealthCheck = (reason: string) => {
      if (isAppShellBlank()) {
        recoverRuntime(reason);
        return;
      }

      if (pendingRecoveryReason && !hasCriticalUserFlowActive()) {
        const nextReason = pendingRecoveryReason;
        pendingRecoveryReason = null;
        recoverRuntime(nextReason);
      }
    };

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
      if (document.visibilityState === "hidden") {
        lastHiddenAt = Date.now();
        return;
      }

      if (document.visibilityState === "visible") {
        checkForUpdates();

        if (
          lastHiddenAt !== null &&
          Date.now() - lastHiddenAt >= PWA_RESUME_HEALTH_CHECK_IDLE_MS
        ) {
          runRuntimeHealthCheck("resume_after_idle");
        }

        lastHiddenAt = null;
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      checkForUpdates();

      if (event.persisted) {
        runRuntimeHealthCheck("pageshow_restore");
      }
    };

    const handleOnline = () => {
      checkForUpdates();
      runRuntimeHealthCheck("online_resume");
    };

    const handleFocus = () => {
      checkForUpdates();
      runRuntimeHealthCheck("window_focus");
    };

    const handleControllerChange = () => {
      if (!hadServiceWorkerControllerAtStartup) {
        return;
      }

      recoverRuntime("service_worker_controller_change", { deferIfActive: true });
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (isRecoverableRuntimeError(event)) {
        recoverRuntime("runtime_asset_failure");
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isRecoverableRuntimeError(event.reason)) {
        recoverRuntime("runtime_asset_failure");
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
      }).catch(() => {
        // Installability should not interrupt Localman runtime behavior.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    clearRecoveryAttemptAfterHealthyLoad();
    window.addEventListener("error", handleWindowError);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      window.removeEventListener("load", register);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
