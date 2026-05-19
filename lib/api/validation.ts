import { z } from "zod";
import { apiError } from "./responses.ts";
import { formatZodIssues } from "../errors/app-error.ts";

type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: Response;
    };

export const DEFAULT_MAX_JSON_BODY_BYTES = 64 * 1024;

type JsonBodyOptions = {
  maxBytes?: number;
};

function createPayloadTooLargeResponse(maxBytes: number): Response {
  return apiError(
    "VALIDATION_ERROR",
    "Request body is too large.",
    413,
    {
      max_bytes: maxBytes,
    },
    "Reduce the request body size and try again.",
  );
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function rejectOversizedRequestBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
): Response | null {
  const contentLength = parseContentLength(request.headers.get("content-length"));

  if (contentLength !== null && contentLength > maxBytes) {
    return createPayloadTooLargeResponse(maxBytes);
  }

  return null;
}

export type JsonBodyReadResult =
  | {
      success: true;
      data: unknown;
      byteLength: number;
    }
  | {
      success: false;
      response: Response;
    };

export async function readJsonBody(
  request: Request,
  { maxBytes = DEFAULT_MAX_JSON_BODY_BYTES }: JsonBodyOptions = {},
): Promise<JsonBodyReadResult> {
  const oversizedResponse = rejectOversizedRequestBody(request, maxBytes);

  if (oversizedResponse) {
    return {
      success: false,
      response: oversizedResponse,
    };
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch {
    return {
      success: false,
      response: apiError(
        "VALIDATION_ERROR",
        "Invalid input.",
        400,
        undefined,
        "The request body could not be read.",
      ),
    };
  }

  const byteLength = getUtf8ByteLength(rawBody);

  if (byteLength > maxBytes) {
    return {
      success: false,
      response: createPayloadTooLargeResponse(maxBytes),
    };
  }

  try {
    return {
      success: true,
      data: JSON.parse(rawBody) as unknown,
      byteLength,
    };
  } catch {
    return {
      success: false,
      response: apiError(
        "VALIDATION_ERROR",
        "Invalid input.",
        400,
        undefined,
        "The request body could not be parsed as JSON.",
      ),
    };
  }
}

export function validateInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      response: apiError(
        "VALIDATION_ERROR",
        "Invalid input.",
        400,
        {
          issues: formatZodIssues(result.error),
        },
        "One or more fields failed validation.",
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

export function validateSearchParams<T>(
  schema: z.ZodType<T>,
  searchParams: URLSearchParams,
): ValidationResult<T> {
  return validateInput(schema, Object.fromEntries(searchParams.entries()));
}

export async function validateJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  options: JsonBodyOptions = {},
): Promise<ValidationResult<T>> {
  const body = await readJsonBody(request, options);

  if (!body.success) {
    return body;
  }

  return validateInput(schema, body.data);
}
