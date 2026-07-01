"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminAuthCard,
  AdminAuthDivider,
  AdminAuthField,
  AdminAuthFields,
  AdminAuthLayout,
  AdminAuthMessage,
  AdminAuthPasswordField,
  AdminAuthSecondaryAction,
  AdminAuthSecurityNotice,
  AdminAuthSubmitButton,
  AdminPasswordStrength,
} from "./admin-auth-experience.tsx";
import {
  initialAdminResetLinkState,
  parseAdminResetLinkHash,
  type AdminResetLinkState,
} from "../../lib/admin/password-reset-link.ts";

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
    <AdminAuthLayout formLabel="Admin password recovery">
      <AdminAuthCard
        title="Forgot your password?"
        description="Enter your administrator email address. We'll send secure password reset instructions."
        onSubmit={handleSubmit}
      >
        <AdminAuthFields>
          <AdminAuthField
            autoComplete="email"
            disabled={status === "submitting"}
            icon="mail"
            id="admin-forgot-password-email"
            inputMode="email"
            label="Email address"
            name="email"
            required
            type="email"
            value={email}
            aria-invalid={error ? "true" : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
        </AdminAuthFields>

        {status === "sent" ? (
          <AdminAuthMessage tone="success">
            If an account exists for that email, password reset instructions have been sent.
          </AdminAuthMessage>
        ) : null}
        {error ? <AdminAuthMessage tone="error">{error}</AdminAuthMessage> : null}

        <AdminAuthSubmitButton disabled={status === "submitting"}>
          {status === "submitting" ? "Sending reset link..." : "Send reset link"}
        </AdminAuthSubmitButton>

        <AdminAuthDivider />

        <AdminAuthSecondaryAction href="/admin/login" icon="arrow-left">
          Back to login
        </AdminAuthSecondaryAction>

        <AdminAuthSecurityNotice>
          Password recovery is protected by the same admin security controls.
        </AdminAuthSecurityNotice>
      </AdminAuthCard>
    </AdminAuthLayout>
  );
}

export function AdminResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLink, setResetLink] = useState<AdminResetLinkState>(initialAdminResetLinkState);
  const [status, setStatus] = useState<"idle" | "submitting" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResetLink(parseAdminResetLinkHash(window.location.hash));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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
    <AdminAuthLayout formLabel="Admin password reset">
      <AdminAuthCard
        title="Create a new password"
        description="Choose a strong password for your administrator account."
        onSubmit={handleSubmit}
      >
        {resetLink.linkError ? <AdminAuthMessage tone="error">{resetLink.linkError}</AdminAuthMessage> : null}

        <AdminAuthFields>
          <AdminAuthPasswordField
            autoComplete="new-password"
            disabled={!resetLink.accessToken || status === "complete"}
            id="admin-reset-password-new"
            label="New password"
            name="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AdminPasswordStrength password={password} />
          <AdminAuthPasswordField
            autoComplete="new-password"
            disabled={!resetLink.accessToken || status === "complete"}
            id="admin-reset-password-confirm"
            label="Confirm password"
            name="confirm_password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </AdminAuthFields>

        {status === "complete" ? (
          <AdminAuthMessage tone="success">Password updated successfully. Return to login.</AdminAuthMessage>
        ) : null}
        {error ? <AdminAuthMessage tone="error">{error}</AdminAuthMessage> : null}

        <AdminAuthSubmitButton disabled={!canSubmit}>
          {status === "submitting" ? "Updating password..." : "Update password"}
        </AdminAuthSubmitButton>

        <AdminAuthDivider />

        <AdminAuthSecondaryAction href="/admin/login" icon="arrow-left">
          Return to login
        </AdminAuthSecondaryAction>

        <AdminAuthSecurityNotice>
          Successful resets revoke governed admin sessions for this account.
        </AdminAuthSecurityNotice>
      </AdminAuthCard>
    </AdminAuthLayout>
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
    <AdminAuthLayout formLabel="Admin change password">
      <AdminAuthCard
        title="Change password"
        description="Update your admin password. Other active sessions will be revoked."
        onSubmit={handleSubmit}
      >
        <AdminAuthFields>
          <AdminAuthPasswordField
            autoComplete="current-password"
            disabled={status === "submitting"}
            id="admin-change-password-current"
            label="Current password"
            name="current_password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <AdminAuthPasswordField
            autoComplete="new-password"
            disabled={status === "submitting"}
            id="admin-change-password-new"
            label="New password"
            name="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AdminPasswordStrength password={password} />
          <AdminAuthPasswordField
            autoComplete="new-password"
            disabled={status === "submitting"}
            id="admin-change-password-confirm"
            label="Confirm password"
            name="confirm_password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </AdminAuthFields>

        {status === "complete" ? <AdminAuthMessage tone="success">Password changed.</AdminAuthMessage> : null}
        {error ? <AdminAuthMessage tone="error">{error}</AdminAuthMessage> : null}

        <AdminAuthSubmitButton disabled={status === "submitting"}>
          {status === "submitting" ? "Saving password..." : "Save password"}
        </AdminAuthSubmitButton>

        <AdminAuthDivider />

        <AdminAuthSecondaryAction href="/admin/dashboard" icon="arrow-left">
          Back to dashboard
        </AdminAuthSecondaryAction>

        <AdminAuthSecurityNotice>
          Password changes preserve audit logging and session governance.
        </AdminAuthSecurityNotice>
      </AdminAuthCard>
    </AdminAuthLayout>
  );
}
