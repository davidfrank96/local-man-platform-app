"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  registerToastDispatcher,
  type ToastInput,
} from "../../lib/errors/ui-error.ts";

type ToastRecord = ToastInput & {
  id: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const toastLifetimeMs = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((toastId: string) => {
    const timeoutId = timeoutsRef.current.get(toastId);

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();

    setToasts((current) => [...current, { ...toast, id }]);

    const timeoutId = window.setTimeout(() => {
      dismissToast(id);
    }, toastLifetimeMs);

    timeoutsRef.current.set(id, timeoutId);
  }, [dismissToast]);

  useEffect(() => {
    const timeoutMap = timeoutsRef.current;
    registerToastDispatcher(showToast);

    return () => {
      registerToastDispatcher(null);

      for (const timeoutId of timeoutMap.values()) {
        window.clearTimeout(timeoutId);
      }

      timeoutMap.clear();
    };
  }, [showToast]);

  const contextValue = useMemo<ToastContextValue>(
    () => ({ showToast }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="global-toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`global-toast global-toast-${toast.type}`}
            role="status"
          >
            <p>{toast.message}</p>
            <button
              type="button"
              className="global-toast-dismiss"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
