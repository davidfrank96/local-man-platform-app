"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AdminSessionError,
  clearLegacyAdminSessionArtifacts,
  fetchAdminSessionIdentity,
  signInAdminSession,
  signOutAdminSession,
  subscribeToAdminSessionEvents,
  type AdminSessionIdentity,
} from "../../lib/admin/session-client.ts";
import { handleAppError } from "../../lib/errors/ui-error.ts";

export type AdminSessionState = {
  status: "loading" | "authenticated" | "unauthenticated" | "forbidden";
  session: AdminSessionIdentity | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleSessionExpired: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionState | null>(null);

function getForbiddenSessionMessage(error: AdminSessionError): string {
  const details = error.details as { table?: string } | undefined;

  if (details?.table === "admin_users") {
    return "Your account does not have access.";
  }

  return error.message || "Your account does not have access.";
}

export function AdminSessionProvider(
  {
    children,
    hasInitialSessionCookie = false,
  }: {
    children: ReactNode;
    hasInitialSessionCookie?: boolean;
  },
) {
  const [status, setStatus] = useState<AdminSessionState["status"]>(
    hasInitialSessionCookie ? "loading" : "unauthenticated",
  );
  const [session, setSession] = useState<AdminSessionIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetToSignedOut = useCallback(async () => {
    await signOutAdminSession().catch(() => undefined);
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async () => {
    // Background session checks can be triggered by focus/visibility changes
    // when a native file picker closes. Keep authenticated workspaces mounted
    // during that revalidation so in-progress forms do not lose local state.
    setStatus((currentStatus) => currentStatus === "authenticated" ? currentStatus : "loading");
    setError(null);

    try {
      const validatedSession = await fetchAdminSessionIdentity();
      setSession(validatedSession);
      setStatus("authenticated");
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        (error.code === "FORBIDDEN" || error.status === 403)
      ) {
        await clearLegacyAdminSessionArtifacts().catch(() => undefined);
        setSession(null);
        setStatus("forbidden");
        setError(getForbiddenSessionMessage(error));
        return;
      }

      if (
        error instanceof AdminSessionError &&
        (error.code === "UNAUTHORIZED" || error.status === 401)
      ) {
        await clearLegacyAdminSessionArtifacts().catch(() => undefined);
        setSession(null);
        setStatus("unauthenticated");
        setError(null);
        return;
      }

      await resetToSignedOut();
      setError(
        handleAppError(error, {
          fallbackMessage: "Unable to restore the admin session.",
          role: "user",
          context: "admin_session_restore",
        }).message,
      );
    }
  }, [resetToSignedOut]);

  useEffect(() => {
    void clearLegacyAdminSessionArtifacts().catch(() => undefined);

    if (!hasInitialSessionCookie) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasInitialSessionCookie, refresh]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const handleWindowFocus = () => {
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh, status]);

  useEffect(() => {
    return subscribeToAdminSessionEvents((event) => {
      if (event.type === "signed_out") {
        setSession(null);
        setStatus("unauthenticated");
        setError(null);
        return;
      }

      void refresh();
    }) ?? undefined;
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    setError(null);

    try {
      const validatedSession = await signInAdminSession(email.trim(), password);
      setSession(validatedSession);
      setStatus("authenticated");
    } catch (error) {
      setSession(null);

      if (
        error instanceof AdminSessionError &&
        (error.code === "FORBIDDEN" || error.status === 403)
      ) {
        setStatus("forbidden");
        setError(getForbiddenSessionMessage(error));
        return;
      }

      setStatus("unauthenticated");
      setError(
        handleAppError(error, {
          fallbackMessage: "Admin login failed.",
          role: "user",
          context: "admin_sign_in",
        }).message,
      );
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await resetToSignedOut();
  }, [resetToSignedOut]);

  return (
    <AdminSessionContext.Provider
      value={{
        status,
        session,
        error,
        signIn,
        signOut,
        handleSessionExpired: signOut,
        refresh,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error("useAdminSession must be used within AdminSessionProvider.");
  }

  return context;
}
