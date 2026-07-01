"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ApiPayload = {
  success: boolean;
  data?: {
    message?: string;
  } | null;
  error?: {
    message?: string;
    detail?: string;
    details?: unknown;
  } | null;
};

function getApiMessage(payload: ApiPayload | null, fallback: string): string {
  return payload?.error?.detail ||
    payload?.error?.message ||
    payload?.data?.message ||
    fallback;
}

async function postJson(path: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-request-id": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiPayload | null;

  if (!response.ok || !payload?.success) {
    throw new Error(getApiMessage(payload, "The password request failed."));
  }

  return getApiMessage(payload, "Done.");
}

export function AdminForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      await postJson("/api/admin/password/forgot", {
        email: email.trim(),
      });
      setStatus("sent");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Password reset request failed.");
      setStatus("idle");
    }
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Admin access</p>
      <h1>Reset your password</h1>
      <p className="page-intro">
        Enter your admin email. If the account exists, a reset link will be sent.
      </p>
      <form className="admin-form admin-login-form" onSubmit={handleSubmit}>
        <label className="field field-wide">
          <span>Email</span>
          <input
            autoComplete="email"
            inputMode="email"
            name="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {status === "sent" ? (
          <p className="success-copy">
            If an admin account exists for that email, a password reset link will be sent.
          </p>
        ) : null}
        {error ? <p className="runtime-error">{error}</p> : null}
        <div className="action-row">
          <button className="button-primary" disabled={status === "submitting"} type="submit">
            Send reset link
          </button>
          <Link className="button-secondary" href="/admin/login">
            Back to login
          </Link>
        </div>
      </form>
    </main>
  );
}

export function AdminResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLink] = useState(() => {
    if (typeof window === "undefined") {
      return {
        accessToken: null as string | null,
        linkError: null as string | null,
      };
    }

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("access_token");
    const errorDescription = params.get("error_description");

    if (errorDescription) {
      return {
        accessToken: null,
        linkError: errorDescription,
      };
    }

    if (!token) {
      return {
        accessToken: null,
        linkError: "This password reset link is invalid or expired.",
      };
    }

    return {
      accessToken: token,
      linkError: null,
    };
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resetLink.accessToken) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [resetLink.accessToken]);

  const canSubmit = useMemo(
    () => Boolean(resetLink.accessToken) && status !== "submitting" && status !== "complete",
    [resetLink.accessToken, status],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      await postJson("/api/admin/password/reset", {
        access_token: resetLink.accessToken,
        password,
        confirm_password: confirmPassword,
      });
      setPassword("");
      setConfirmPassword("");
      setStatus("complete");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Password reset failed.");
      setStatus("idle");
    }
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Admin access</p>
      <h1>Choose a new password</h1>
      <p className="page-intro">Use a strong password for your Localman admin account.</p>
      <form className="admin-form admin-login-form" onSubmit={handleSubmit}>
        {resetLink.linkError ? <p className="runtime-error">{resetLink.linkError}</p> : null}
        <label className="field field-wide">
          <span>New password</span>
          <input
            autoComplete="new-password"
            disabled={!resetLink.accessToken || status === "complete"}
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            disabled={!resetLink.accessToken || status === "complete"}
            name="confirm_password"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        {status === "complete" ? (
          <p className="success-copy">Password reset complete. Sign in with your new password.</p>
        ) : null}
        {error ? <p className="runtime-error">{error}</p> : null}
        <div className="action-row">
          <button className="button-primary" disabled={!canSubmit} type="submit">
            Update password
          </button>
          <Link className="button-secondary" href="/admin/login">
            Back to login
          </Link>
        </div>
      </form>
    </main>
  );
}

export function AdminChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      await postJson("/api/admin/password/change", {
        current_password: currentPassword,
        password,
        confirm_password: confirmPassword,
      });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setStatus("complete");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Password change failed.");
      setStatus("idle");
    }
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Admin security</p>
      <h1>Change password</h1>
      <p className="page-intro">Update your admin password. Other active sessions will be revoked.</p>
      <form className="admin-form admin-login-form" onSubmit={handleSubmit}>
        <label className="field field-wide">
          <span>Current password</span>
          <input
            autoComplete="current-password"
            name="current_password"
            required
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>New password</span>
          <input
            autoComplete="new-password"
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>Confirm password</span>
          <input
            autoComplete="new-password"
            name="confirm_password"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        {status === "complete" ? <p className="success-copy">Password changed.</p> : null}
        {error ? <p className="runtime-error">{error}</p> : null}
        <div className="action-row">
          <button className="button-primary" disabled={status === "submitting"} type="submit">
            Change password
          </button>
          <Link className="button-secondary" href="/admin/dashboard">
            Back to dashboard
          </Link>
        </div>
      </form>
    </main>
  );
}
