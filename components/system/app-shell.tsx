"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GlobalErrorBoundary } from "./global-error-boundary.tsx";
import { PwaRuntime } from "./pwa-runtime.tsx";
import { ToastProvider } from "./toast-provider.tsx";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <PwaRuntime />
      <GlobalErrorBoundary resetKey={pathname}>
        {children}
      </GlobalErrorBoundary>
    </ToastProvider>
  );
}
