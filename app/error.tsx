"use client";

import { useEffect } from "react";
import { LocalmanRecoveryFallback } from "../components/system/localman-recovery-fallback.tsx";
import { handleAppError } from "../lib/errors/ui-error.ts";

export default function AppError({
  error,
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

  return <LocalmanRecoveryFallback />;
}
