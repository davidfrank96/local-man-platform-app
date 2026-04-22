import { z } from "zod";
import { apiError } from "./responses.ts";

type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: Response;
    };

type Issue = {
  path: string;
  message: string;
};

function formatIssues(error: z.ZodError): Issue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      response: apiError("VALIDATION_ERROR", "Invalid request.", 400, {
        issues: formatIssues(result.error),
      }),
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
      response: apiError("VALIDATION_ERROR", "Invalid JSON request body.", 400),
    };
  }
}
