"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAdminNextPath } from "../../lib/admin/navigation.ts";
import {
  AdminAuthCard,
  AdminAuthDivider,
  AdminAuthField,
  AdminAuthFields,
  AdminAuthFormLinks,
  AdminAuthLayout,
  AdminAuthMessage,
  AdminAuthPasswordField,
  AdminAuthSecondaryAction,
  AdminAuthSecurityNotice,
  AdminAuthSubmitButton,
} from "./admin-auth-experience.tsx";
import { useAdminSession } from "./admin-session-provider.tsx";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, error, session, signIn, signOut } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const nextPath = searchParams.get("next");
  const isSubmitting = status === "loading";
  const activeError = localError ?? error;

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace(resolveAdminNextPath(session.adminUser.role, nextPath));
    }
  }, [nextPath, router, session, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Admin login failed.");
    }
  }

  return (
    <AdminAuthLayout formLabel="Admin sign in">
      <AdminAuthCard
        title="Welcome back"
        description="Sign in to continue to your admin workspace."
        onSubmit={handleSubmit}
      >
        <AdminAuthFields>
          <AdminAuthField
            autoComplete="email"
            disabled={isSubmitting}
            icon="mail"
            id="admin-login-email"
            inputMode="email"
            label="Email address"
            name="email"
            required
            type="email"
            value={email}
            aria-invalid={activeError ? "true" : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />

          <AdminAuthPasswordField
            autoComplete="current-password"
            disabled={isSubmitting}
            id="admin-login-password"
            label="Password"
            name="password"
            required
            value={password}
            aria-invalid={activeError ? "true" : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
        </AdminAuthFields>

        <AdminAuthFormLinks>
          <Link href="/admin/forgot-password">Forgot password?</Link>
        </AdminAuthFormLinks>

        {activeError ? <AdminAuthMessage tone="error">{activeError}</AdminAuthMessage> : null}

        <AdminAuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in to dashboard"}
        </AdminAuthSubmitButton>

        {status === "forbidden" ? (
          <AdminAuthSecondaryAction onClick={() => void signOut()}>Sign out</AdminAuthSecondaryAction>
        ) : null}

        <AdminAuthDivider />

        <AdminAuthSecondaryAction href="/" icon="arrow-left">
          Back to app
        </AdminAuthSecondaryAction>

        <AdminAuthSecurityNotice />
      </AdminAuthCard>
    </AdminAuthLayout>
  );
}
