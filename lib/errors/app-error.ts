import { z } from "zod";
import type { AppErrorCode, AppErrorContract } from "../api/contracts.ts";

export class AppError extends Error implements AppErrorContract {
  code: AppErrorCode;
  status?: number;
  detail?: string;
  details?: unknown;
  requestId?: string | null;

  constructor(
    code: AppErrorCode,
    message: string,
    status?: number,
    details?: unknown,
    detail?: string,
    requestId?: string | null,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.details = details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function formatZodIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function isNetworkError(error: Error): boolean {
  const normalized = `${error.name} ${error.message}`.toLowerCase();
  return (
    error.name === "TypeError" ||
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("load failed")
  );
}

type MapExternalErrorFallback = {
  code?: AppErrorCode;
  message?: string;
  status?: number;
  detail?: string;
  details?: unknown;
  requestId?: string | null;
};

export function mapExternalError(
  error: unknown,
  fallback: MapExternalErrorFallback = {},
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new AppError(
      "VALIDATION_ERROR",
      "Invalid input.",
      400,
      { issues: formatZodIssues(error) },
      "One or more fields failed validation.",
      fallback.requestId,
    );
  }

  if (error instanceof Error && isNetworkError(error)) {
    return new AppError(
      "NETWORK_ERROR",
      fallback.message ?? "A network request failed.",
      fallback.status ?? 502,
      fallback.details,
      fallback.detail ?? "The request could not reach the upstream service.",
      fallback.requestId,
    );
  }

  return new AppError(
    fallback.code ?? "UNKNOWN_ERROR",
    fallback.message ?? "An unexpected error occurred.",
    fallback.status ?? 500,
    fallback.details,
    fallback.detail ?? "The operation failed unexpectedly.",
    fallback.requestId,
  );
}
