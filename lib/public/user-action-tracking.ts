import type { DeviceType, UserActionEventName, LocationSource } from "../../types/index.ts";

type PublicUserActionEventInput = {
  event_type: UserActionEventName;
  session_id?: string;
  vendor_id?: string;
  timestamp?: string;
  device_type?: DeviceType;
  location_source?: LocationSource | null;
  vendor_slug?: string;
  page_path?: string;
  search_query?: string;
  filters?: {
    search?: string;
    radiusKm?: number;
    openNow?: boolean;
    priceBand?: "budget" | "standard" | "premium" | "";
    category?: string;
  };
  metadata?: Record<string, string | number | boolean | null>;
};

type TrackingTransport = {
  navigatorImpl?: Pick<Navigator, "sendBeacon"> | null;
  fetchImpl?: typeof fetch;
  storageImpl?: StorageLike;
};

type LastInteractionSnapshot = {
  event_type: string | null;
  vendor_id: string | null;
  vendor_slug: string | null;
  page_path: string;
  location_source: LocationSource | null;
  timestamp: string;
};

type LastContextSnapshot = {
  page_path: string;
  location_source: LocationSource | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null;

const SESSION_ID_KEY = "public-tracking-session-id";
const SESSION_STARTED_KEY = "public-tracking-session-started";
const FIRST_INTERACTION_KEY = "public-tracking-first-interaction";
const LAST_INTERACTION_KEY = "public-tracking-last-interaction";
const LAST_CONTEXT_KEY = "public-tracking-last-context";

let sessionLifecycleBound = false;

function getTrackingStorage(storageImpl?: StorageLike): StorageLike {
  if (storageImpl !== undefined) {
    return storageImpl;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "00000000-0000-4000-8000-".concat(
    Math.random().toString(16).slice(2, 14).padEnd(12, "0"),
  );
}

function getOrCreateSessionId(storage: StorageLike): string {
  const existing = storage?.getItem(SESSION_ID_KEY);

  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  storage?.setItem(SESSION_ID_KEY, sessionId);

  return sessionId;
}

function isLifecycleEvent(eventType: UserActionEventName): boolean {
  return (
    eventType === "session_started" ||
    eventType === "first_interaction" ||
    eventType === "last_interaction"
  );
}

function getDeviceType(): DeviceType {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const width = window.innerWidth;

  if (width < 640) {
    return "mobile";
  }

  if (width < 1024) {
    return "tablet";
  }

  return "desktop";
}

function getCurrentPagePath(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function persistLastInteraction(
  storage: StorageLike,
  event: PublicUserActionEventInput,
): void {
  if (!storage) {
    return;
  }

  const context = {
    event_type: event.event_type,
    vendor_id: event.vendor_id ?? null,
    vendor_slug: event.vendor_slug ?? null,
    page_path: event.page_path ?? getCurrentPagePath(),
    location_source: event.location_source ?? null,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  storage.setItem(LAST_INTERACTION_KEY, JSON.stringify(context));
}

function persistLastContext(
  storage: StorageLike,
  event: PublicUserActionEventInput,
): void {
  if (!storage) {
    return;
  }

  storage.setItem(
    LAST_CONTEXT_KEY,
    JSON.stringify({
      page_path: event.page_path ?? getCurrentPagePath(),
      location_source: event.location_source ?? null,
    }),
  );
}

function normalizeUserActionEvent(
  event: PublicUserActionEventInput,
  storage: StorageLike,
): PublicUserActionEventInput {
  return {
    ...event,
    session_id: event.session_id ?? getOrCreateSessionId(storage),
    page_path: event.page_path || getCurrentPagePath(),
    timestamp: event.timestamp ?? new Date().toISOString(),
    device_type: event.device_type ?? getDeviceType(),
    location_source: event.location_source ?? null,
    filters: event.filters ?? {},
    metadata: event.metadata ?? {},
  };
}

async function dispatchTrackingEvent(
  event: PublicUserActionEventInput,
  {
    navigatorImpl = typeof navigator !== "undefined" ? navigator : null,
    fetchImpl = fetch,
    storageImpl,
  }: TrackingTransport = {},
): Promise<void> {
  const storage = getTrackingStorage(storageImpl);
  const payload = normalizeUserActionEvent(event, storage);
  const body = JSON.stringify(payload);

  if (navigatorImpl?.sendBeacon) {
    try {
      const accepted = navigatorImpl.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" }),
      );

      if (accepted) {
        return;
      }
    } catch {
      // Ignore sendBeacon failures and fall back to fetch.
    }
  }

  try {
    await fetchImpl("/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
      keepalive: true,
    });
  } catch {
    // Do not block user interactions on tracking failures.
  }
}

function bindSessionLifecycleListeners(): void {
  if (sessionLifecycleBound || typeof window === "undefined") {
    return;
  }

  const flushLastInteraction = () => {
    const storage = getTrackingStorage();

    if (!storage) {
      return;
    }

    const rawLastInteraction = storage.getItem(LAST_INTERACTION_KEY);
    const rawLastContext = storage.getItem(LAST_CONTEXT_KEY);

    let lastInteraction: LastInteractionSnapshot | null = null;
    let lastContext: LastContextSnapshot | null = null;

    try {
      lastInteraction = rawLastInteraction
        ? (JSON.parse(rawLastInteraction) as LastInteractionSnapshot)
        : null;
    } catch {
      lastInteraction = null;
    }

    try {
      lastContext = rawLastContext ? (JSON.parse(rawLastContext) as LastContextSnapshot) : null;
    } catch {
      lastContext = null;
    }

    const pagePath = lastInteraction?.page_path ?? lastContext?.page_path ?? getCurrentPagePath();
    const locationSource =
      lastInteraction?.location_source ?? lastContext?.location_source ?? null;

    void dispatchTrackingEvent({
      event_type: "last_interaction",
      vendor_id: lastInteraction?.vendor_id ?? undefined,
      vendor_slug: lastInteraction?.vendor_slug ?? undefined,
      page_path: pagePath,
      location_source: locationSource,
      metadata: {
        last_event_type: lastInteraction?.event_type ?? null,
      },
      filters: {},
    });
  };

  window.addEventListener("pagehide", flushLastInteraction);
  sessionLifecycleBound = true;
}

export async function ensurePublicTrackingSession(
  event: Pick<PublicUserActionEventInput, "page_path" | "location_source"> = {},
  transport?: TrackingTransport,
): Promise<void> {
  const storage = getTrackingStorage(transport?.storageImpl);
  const hasStarted = storage?.getItem(SESSION_STARTED_KEY) === "1";

  persistLastContext(storage, {
    event_type: "session_started",
    page_path: event.page_path,
    location_source: event.location_source ?? null,
  });
  bindSessionLifecycleListeners();

  if (hasStarted) {
    return;
  }

  storage?.setItem(SESSION_STARTED_KEY, "1");

  await dispatchTrackingEvent(
    {
      event_type: "session_started",
      page_path: event.page_path,
      location_source: event.location_source ?? null,
      filters: {},
      metadata: {},
    },
    transport,
  );
}

export async function dispatchPublicUserAction(
  event: PublicUserActionEventInput,
  transport: TrackingTransport = {},
): Promise<void> {
  const storage = getTrackingStorage(transport.storageImpl);

  await ensurePublicTrackingSession(
    {
      page_path: event.page_path,
      location_source: event.location_source ?? null,
    },
    transport,
  );

  if (!isLifecycleEvent(event.event_type) && storage?.getItem(FIRST_INTERACTION_KEY) !== "1") {
    storage?.setItem(FIRST_INTERACTION_KEY, "1");

    await dispatchTrackingEvent(
      {
        ...event,
        event_type: "first_interaction",
        metadata: {
          ...(event.metadata ?? {}),
          first_event_type: event.event_type,
        },
      },
      transport,
    );
  }

  persistLastContext(storage, event);

  if (!isLifecycleEvent(event.event_type)) {
    persistLastInteraction(storage, event);
  }

  await dispatchTrackingEvent(event, transport);
}

export function trackPublicUserAction(event: PublicUserActionEventInput): void {
  void dispatchPublicUserAction(event);
}
