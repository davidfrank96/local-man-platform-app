const DEV_PERF_LOGGING = process.env.NODE_ENV !== "production";

declare global {
  interface Window {
    __LOCAL_MAN_DEV_TIMERS__?: Set<string>;
  }
}

function getActiveTimerStore(): Set<string> | null {
  if (!DEV_PERF_LOGGING || typeof window === "undefined") {
    return null;
  }

  window.__LOCAL_MAN_DEV_TIMERS__ ??= new Set<string>();
  return window.__LOCAL_MAN_DEV_TIMERS__;
}

export function startDevTimer(label: string) {
  const activeTimers = getActiveTimerStore();

  if (!activeTimers || activeTimers.has(label)) {
    return;
  }

  console.time(label);
  activeTimers.add(label);
}

export function endDevTimer(label: string) {
  const activeTimers = getActiveTimerStore();

  if (!activeTimers || !activeTimers.has(label)) {
    return;
  }

  console.timeEnd(label);
  activeTimers.delete(label);
}
