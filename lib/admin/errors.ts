import { apiError } from "../api/responses.ts";
import { logStructuredEvent } from "../observability.ts";
import { AppError, mapExternalError } from "../errors/app-error.ts";

export type AdminServiceErrorCode =
  | "CONFIGURATION_ERROR"
  | "CONFIG_ERROR"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "AUTH_PROVIDER_ERROR"
  | "USER_ALREADY_EXISTS"
  | "INVALID_PASSWORD"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class AdminServiceError extends AppError {}

export function handleAdminServiceError(
  error: unknown,
  fallbackMessage: string,
): Response {
  const appError = error instanceof AdminServiceError
    ? error
    : mapExternalError(error, {
      code: "UNKNOWN_ERROR",
      message: fallbackMessage,
      status: 502,
      detail: "The service failed while processing the request.",
    });

  logStructuredEvent("error", {
    event: "ADMIN_SERVICE_ERROR",
    area: "admin",
    errorCode: appError.code,
    status: appError.status ?? 502,
    message: appError.message,
    detail: appError.detail ?? null,
    requestId: appError.requestId ?? null,
    context: "admin_service",
    error,
    details: appError.details,
  });

  return apiError(
    appError.code,
    appError.message,
    appError.status ?? 502,
    appError.details,
    appError.detail,
  );
}
