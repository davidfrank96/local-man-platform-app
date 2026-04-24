export type AdminFieldErrors = Record<string, string>;

type ValidationIssue = {
  path?: string[];
  message?: string;
};

type ValidationDetails = {
  issues?: ValidationIssue[];
};

export type ValidationFeedback = {
  fieldErrors: AdminFieldErrors;
  formError: string | null;
};

export function extractValidationFeedback(details: unknown): ValidationFeedback {
  const fieldErrors: AdminFieldErrors = {};
  let formError: string | null = null;

  if (!details || typeof details !== "object") {
    return { fieldErrors, formError };
  }

  const issues = (details as ValidationDetails).issues;

  if (!Array.isArray(issues)) {
    return { fieldErrors, formError };
  }

  for (const issue of issues) {
    const path = Array.isArray(issue.path) ? issue.path.filter(Boolean).join(".") : "";
    const message = typeof issue.message === "string" ? issue.message : "Invalid value.";

    if (path.length === 0) {
      formError ??= message;
      continue;
    }

    fieldErrors[path] = message;
  }

  return { fieldErrors, formError };
}
