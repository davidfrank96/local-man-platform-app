"use client";

import { useEffect } from "react";
import { handleAppError } from "../lib/errors/ui-error.ts";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleAppError(error, {
      fallbackMessage: "Something went wrong. Please refresh.",
      role: "user",
      context: "app_error_boundary",
    });
  }, [error]);

  return (
    <div className="global-error-fallback" role="alert">
      <h1>Something went wrong.</h1>
      <p>Please refresh.</p>
      <div className="action-row">
        <button className="button-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
        <button className="button-secondary" type="button" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
    </div>
  );
}
