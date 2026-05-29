"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { handleAppError } from "../../lib/errors/ui-error.ts";
import { LocalmanRecoveryFallback } from "./localman-recovery-fallback.tsx";

type GlobalErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
};

type GlobalErrorBoundaryState = {
  hasError: boolean;
};

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    handleAppError(error, {
      fallbackMessage: "Something went wrong. Please refresh.",
      role: "user",
      context: "render_boundary",
    });

    console.error({
      type: "ERROR",
      code: "RENDER_ERROR",
      message: error.message,
      detail: "A React render error was caught by the global boundary.",
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(previousProps: GlobalErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <LocalmanRecoveryFallback />;
    }

    return this.props.children;
  }
}
