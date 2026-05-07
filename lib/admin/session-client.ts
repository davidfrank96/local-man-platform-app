import { AppError, mapExternalError } from "../errors/app-error.ts";
import { logStructuredEvent } from "../observability.ts";
import type { AdminRole } from "../../types/index.ts";

const ADMIN_SESSION_STORAGE_KEY = "local-man-admin-session";
const LEGACY_SUPABASE_AUTH_KEY_PATTERN = /^sb-.*-auth-token$/;
const ADMIN_SESSION_CHANNEL_NAME = "localman_admin_session";

export type AdminSessionIdentity = {
  user: {
    id: string;
    email?: string;
  };
  adminUser: {
    id: string;
    email: string;
    full_name: string | null;
    role: AdminRole;
  };
};

export class AdminSessionError extends AppError {}

export type AdminSessionBroadcastEvent = {
  type: "signed_in" | "signed_out";
};

function logAdminSessionEvent(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  logStructuredEvent(level, {
    type: level === "error" ? "ERROR" : "ADMIN_SESSION_EVENT",
    message,
    context: "admin_session",
    ...details,
  });
}

function getLegacyStorageKeys(storage: Storage): string[] {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key) {
      continue;
    }

    if (key === ADMIN_SESSION_STORAGE_KEY || LEGACY_SUPABASE_AUTH_KEY_PATTERN.test(key)) {
      keys.push(key);
    }
  }

  return keys;
}

export async function clearLegacyAdminSessionArtifacts(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const storage = window.localStorage;

      for (const key of getLegacyStorageKeys(storage)) {
        storage.removeItem(key);
      }
    } catch {
      // Ignore storage cleanup failures.
    }
  }
}

function publishAdminSessionEvent(event: AdminSessionBroadcastEvent): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }

  try {
    const channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    // Ignore broadcast failures.
  }
}

export function subscribeToAdminSessionEvents(
  listener: (event: AdminSessionBroadcastEvent) => void,
): (() => void) | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  const channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL_NAME);
  const handleMessage = (message: MessageEvent<AdminSessionBroadcastEvent>) => {
    if (
      message.data?.type === "signed_in" ||
      message.data?.type === "signed_out"
    ) {
      listener(message.data);
    }
  };

  channel.addEventListener("message", handleMessage);

  return () => {
    channel.removeEventListener("message", handleMessage);
    channel.close();
  };
}

async function requestAdminSessionRoute<T>(
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await fetchImpl(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      "x-request-id": crypto.randomUUID(),
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success: boolean;
        data: T | null;
        error?: {
          code?: string;
          message?: string;
          detail?: string;
          details?: unknown;
        } | null;
      }
    | null;

  if (!response.ok || !payload?.success || !payload.data) {
    logAdminSessionEvent("warn", "admin session route request failed", {
      path,
      status: response.status,
      code: payload?.error?.code ?? "SESSION_ERROR",
      message: payload?.error?.message ?? "Unable to validate admin session.",
    });
    throw new AdminSessionError(
      (payload?.error?.code as import("../api/contracts.ts").AppErrorCode | undefined) ?? "SESSION_ERROR",
      payload?.error?.message ?? "Unable to validate admin session.",
      response.status,
      payload?.error?.details,
      payload?.error?.detail,
    );
  }

  return payload.data;
}

export async function signInAdminSession(
  email: string,
  password: string,
  fetchImpl?: typeof fetch,
): Promise<AdminSessionIdentity> {
  try {
    await clearLegacyAdminSessionArtifacts();
    const identity = await requestAdminSessionRoute<AdminSessionIdentity>(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      },
      fetchImpl,
    );

    logAdminSessionEvent("info", "password sign-in succeeded", {
      userId: identity.user.id,
      role: identity.adminUser.role,
    });
    publishAdminSessionEvent({ type: "signed_in" });

    return identity;
  } catch (error) {
    const mapped = error instanceof AdminSessionError
      ? error
      : mapExternalError(error, {
        code: "UNKNOWN_ERROR",
        message: "Admin authentication failed.",
        status: 502,
        detail: "The login flow failed unexpectedly.",
      });
    logAdminSessionEvent("warn", "password sign-in failed", {
      code: mapped.code,
      status: mapped.status ?? null,
      detail: mapped.detail ?? null,
      message: mapped.message,
    });
    throw mapped;
  }
}

export async function signOutAdminSession(fetchImpl: typeof fetch = fetch): Promise<void> {
  await fetchImpl("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "x-request-id": crypto.randomUUID(),
    },
  }).catch(() => undefined);

  await clearLegacyAdminSessionArtifacts();
  publishAdminSessionEvent({ type: "signed_out" });
}

export async function fetchAdminSessionIdentity(
  fetchImpl: typeof fetch = fetch,
): Promise<AdminSessionIdentity> {
  const identity = await requestAdminSessionRoute<AdminSessionIdentity>(
    "/api/admin/session",
    {
      method: "GET",
    },
    fetchImpl,
  );

  logAdminSessionEvent("info", "admin identity validated", {
    userId: identity.user.id,
    role: identity.adminUser.role,
  });

  return identity;
}
