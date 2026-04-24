import assert from "node:assert/strict";
import test from "node:test";
import { extractValidationFeedback } from "../lib/admin/form-errors.ts";

test("maps validation issues to field errors", () => {
  const feedback = extractValidationFeedback({
    issues: [
      {
        path: ["slug"],
        message: "Use lowercase words separated by hyphens.",
      },
      {
        path: ["latitude"],
        message: "Latitude must be between -90 and 90.",
      },
    ],
  });

  assert.deepEqual(feedback.fieldErrors, {
    slug: "Use lowercase words separated by hyphens.",
    latitude: "Latitude must be between -90 and 90.",
  });
  assert.equal(feedback.formError, null);
});

test("captures root validation messages as form errors", () => {
  const feedback = extractValidationFeedback({
    issues: [
      {
        path: [],
        message: "Invalid request.",
      },
    ],
  });

  assert.deepEqual(feedback.fieldErrors, {});
  assert.equal(feedback.formError, "Invalid request.");
});
