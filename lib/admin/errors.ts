import { apiError } from "../api/responses.ts";

export type AdminServiceErrorCode =
  | "CONFIGURATION_ERROR"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR";

export class AdminServiceError extends Error {
  code: AdminServiceErrorCode;
  status: number;
  details?: unknown;

  constructor(
    code: AdminServiceErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "AdminServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function handleAdminServiceError(
  error: unknown,
  fallbackMessage: string,
): Response {
  if (error instanceof AdminServiceError) {
    return apiError(error.code, error.message, error.status, error.details);
  }

  return apiError("UPSTREAM_ERROR", fallbackMessage, 502);
}
