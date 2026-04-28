"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { handleAppError } from "../../lib/errors/ui-error.ts";

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
      return (
        <div className="global-error-fallback" role="alert">
          <h1>Something went wrong.</h1>
          <p>Please refresh.</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
