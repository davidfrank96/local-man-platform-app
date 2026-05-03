type NetworkStatusListener = () => void;

const listeners = new Set<NetworkStatusListener>();
let listenersBound = false;

function notifyNetworkStatusListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function bindBrowserNetworkListeners() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }

  window.addEventListener("online", notifyNetworkStatusListeners);
  window.addEventListener("offline", notifyNetworkStatusListeners);
  listenersBound = true;
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine !== false;
}

export function isBrowserOffline(): boolean {
  return !isBrowserOnline();
}

export function subscribeToBrowserNetworkStatus(
  listener: NetworkStatusListener,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  bindBrowserNetworkListeners();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
