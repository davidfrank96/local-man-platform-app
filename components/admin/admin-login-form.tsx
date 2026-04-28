"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveAdminNextPath } from "../../lib/admin/navigation.ts";
import { useAdminSession } from "./admin-session-provider.tsx";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, error, session, signIn, signOut } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const nextPath = searchParams.get("next");

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
    <main className="page-shell">
      <p className="eyebrow">Phase 4B admin access</p>
      <h1>Admin login</h1>
      <p className="page-intro">Sign in with an admin account to manage vendor records.</p>
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
        <label className="field field-wide">
          <span>Password</span>
          <input
            autoComplete="current-password"
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {localError || error ? <p className="runtime-error">{localError ?? error}</p> : null}
        <div className="action-row">
          <button className="button-primary" disabled={status === "loading"} type="submit">
            Sign in
          </button>
          {status === "forbidden" ? (
            <button className="button-secondary" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          ) : null}
          <Link className="button-secondary" href="/">
            Back to app
          </Link>
        </div>
      </form>
    </main>
  );
}
