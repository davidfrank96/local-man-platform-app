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
  clearStoredAdminSession,
  fetchAdminSessionIdentity,
  persistAdminSession,
  readStoredAdminSession,
  refreshAdminSession,
  shouldRefreshAdminSession,
  signInAdminSession,
  signOutAdminSession,
  type AdminSessionIdentity,
  type StoredAdminSession,
} from "../../lib/admin/session-client.ts";

export type AdminSessionState = {
  status: "loading" | "authenticated" | "unauthenticated" | "forbidden";
  session: (StoredAdminSession & AdminSessionIdentity) | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleSessionExpired: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionState | null>(null);

async function validateStoredSession(
  storedSession: StoredAdminSession,
): Promise<(StoredAdminSession & AdminSessionIdentity) | null> {
  let nextSession = storedSession;

  if (shouldRefreshAdminSession(storedSession) && storedSession.refreshToken) {
    nextSession = await refreshAdminSession(storedSession.refreshToken);
    persistAdminSession(nextSession);
  }

  const identity = await fetchAdminSessionIdentity(nextSession.accessToken);

  const validatedSession = {
    ...nextSession,
    ...identity,
  };

  persistAdminSession(nextSession);
  return validatedSession;
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminSessionState["status"]>("loading");
  const [session, setSession] = useState<(StoredAdminSession & AdminSessionIdentity) | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const resetToSignedOut = useCallback(async () => {
    const storedSession = readStoredAdminSession();

    if (storedSession?.accessToken) {
      await signOutAdminSession(storedSession.accessToken).catch(() => undefined);
    }

    clearStoredAdminSession();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async () => {
    const storedSession = readStoredAdminSession();

    if (!storedSession) {
      setSession(null);
      setStatus("unauthenticated");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const validatedSession = await validateStoredSession(storedSession);
      setSession(validatedSession);
      setStatus("authenticated");
    } catch (error) {
      if (
        error instanceof AdminSessionError &&
        (error.code === "FORBIDDEN" || error.status === 403)
      ) {
        clearStoredAdminSession();
        setSession(null);
        setStatus("forbidden");
        setError("Authenticated account is not listed as an admin.");
        return;
      }

      await resetToSignedOut();
      setError(
        error instanceof Error ? error.message : "Unable to restore the admin session.",
      );
    }
  }, [resetToSignedOut]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    setError(null);

    try {
      const storedSession = await signInAdminSession(email, password);
      persistAdminSession(storedSession);
      const validatedSession = await validateStoredSession(storedSession);
      setSession(validatedSession);
      setStatus("authenticated");
    } catch (error) {
      clearStoredAdminSession();
      setSession(null);

      if (
        error instanceof AdminSessionError &&
        (error.code === "FORBIDDEN" || error.status === 403)
      ) {
        clearStoredAdminSession();
        setStatus("forbidden");
        setError("Authenticated account is not listed as an admin.");
        return;
      }

      setStatus("unauthenticated");
      setError(error instanceof Error ? error.message : "Admin login failed.");
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
