import type {
  ApiEndpointContract,
  AppErrorCode as ApiErrorCode,
  AppErrorContract,
} from "@/lib/api/contracts";

export type { ApiErrorCode };

export type ApiError = AppErrorContract & {
  details?: unknown;
};

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: ApiError;
    };

export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json(
    {
      success: true,
      data,
      error: null,
    } satisfies ApiResponse<T>,
    { status },
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
  detail?: string,
): Response {
  return Response.json(
    {
      success: false,
      data: null,
      error: {
        code,
        message,
        status,
        ...(detail === undefined ? {} : { detail }),
        ...(details === undefined ? {} : { details }),
      },
    } satisfies ApiResponse<never>,
    { status },
  );
}

export function apiNotImplemented(endpoint: ApiEndpointContract): Response {
  return apiError(
    "NOT_IMPLEMENTED",
    `${endpoint.method} ${endpoint.path} is defined, but business logic is not implemented yet.`,
    501,
    {
      access: endpoint.access,
      requestShape: endpoint.requestShape,
      responseShape: endpoint.responseShape,
      validationBoundary: endpoint.validationBoundary,
    },
  );
}
