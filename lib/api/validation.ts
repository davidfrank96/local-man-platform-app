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
): Promise<ValidationResult<T>> {
  try {
    const body: unknown = await request.json();

    return validateInput(schema, body);
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
