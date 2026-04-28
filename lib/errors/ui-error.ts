import { AppError } from "./app-error.ts";

export type ErrorVisibilityRole = "admin" | "agent" | "user";
export type ToastType = "success" | "error" | "info";
export type ToastInput = {
  type: ToastType;
  message: string;
};

export type VisibleError = {
  message: string;
  code: string | null;
  detail: string | null;
};

type StructuredUiError = {
  code?: string;
  message?: string;
  detail?: string | null;
};

let toastDispatcher: ((toast: ToastInput) => void) | null = null;

export function registerToastDispatcher(
  dispatcher: ((toast: ToastInput) => void) | null,
): void {
  toastDispatcher = dispatcher;
}

export function showToast(toast: ToastInput): void {
  toastDispatcher?.(toast);
}

function extractErrorCode(error: Error): string | null {
  const matched = error.message.match(/^([A-Z_]+):\s*/);
  return matched?.[1] ?? null;
}

function normalizeFallbackMessage(error: Error, fallbackMessage: string): string {
  const normalized = error.message.toLowerCase();

  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed")
  ) {
    return "Network error. Try again.";
  }

  return error.message || fallbackMessage;
}

function isStructuredUiError(error: unknown): error is StructuredUiError {
  return !!error && typeof error === "object" &&
    ("message" in error || "code" in error || "detail" in error);
}

export function handleApiError(
  error: unknown,
  fallbackMessage: string,
  role: ErrorVisibilityRole,
): VisibleError {
  if (isStructuredUiError(error)) {
    const message = typeof error.message === "string" && error.message.trim().length > 0
      ? error.message
      : fallbackMessage;
    const code = typeof error.code === "string" ? error.code : null;
    const detail = typeof error.detail === "string" ? error.detail : null;

    return {
      message,
      code: role === "admin" ? code : null,
      detail: role === "admin" ? detail : null,
    };
  }

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: role === "admin" ? error.code : null,
      detail: role === "admin" ? error.detail ?? null : null,
    };
  }

  if (error instanceof Error) {
    return {
      message: normalizeFallbackMessage(error, fallbackMessage),
      code: role === "admin" ? extractErrorCode(error) : null,
      detail: null,
    };
  }

  return {
    message: fallbackMessage,
    code: null,
    detail: null,
  };
}

export function logClientError(
  error: unknown,
  fallbackMessage: string,
  context?: string,
): void {
  if (process.env.NEXT_PUBLIC_SILENCE_EXPECTED_ERRORS === "true") {
    return;
  }

  const log = process.env.NODE_ENV === "development" ? console.warn : console.error;

  if (isStructuredUiError(error)) {
    log({
      type: "ERROR",
      code: typeof error.code === "string" ? error.code : "UNKNOWN_ERROR",
      message: typeof error.message === "string" ? error.message : fallbackMessage,
      detail: typeof error.detail === "string" ? error.detail : null,
      context: context ?? null,
    });
    return;
  }

  if (error instanceof AppError) {
    log({
      type: "ERROR",
      code: error.code,
      message: error.message,
      detail: error.detail ?? null,
      context: context ?? null,
    });
    return;
  }

  if (error instanceof Error) {
    log({
      type: "ERROR",
      code: "UNKNOWN_ERROR",
      message: normalizeFallbackMessage(error, fallbackMessage),
      context: context ?? null,
    });
    return;
  }

  log({
    type: "ERROR",
    code: "UNKNOWN_ERROR",
    message: fallbackMessage,
    context: context ?? null,
  });
}

export function handleAppError(
  error: unknown,
  options?: {
    fallbackMessage?: string;
    role?: ErrorVisibilityRole;
    context?: string;
    toast?: boolean;
  },
): VisibleError {
  const fallbackMessage = options?.fallbackMessage ?? "Something went wrong.";
  const role = options?.role ?? "user";
  const visibleError = handleApiError(error, fallbackMessage, role);

  logClientError(error, fallbackMessage, options?.context);

  if (options?.toast !== false) {
    showToast({
      type: "error",
      message: visibleError.message,
    });
  }

  return visibleError;
}
