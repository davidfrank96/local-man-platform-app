"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GlobalErrorBoundary } from "./global-error-boundary.tsx";
import { ToastProvider } from "./toast-provider.tsx";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <GlobalErrorBoundary resetKey={pathname}>
        {children}
      </GlobalErrorBoundary>
    </ToastProvider>
  );
}
