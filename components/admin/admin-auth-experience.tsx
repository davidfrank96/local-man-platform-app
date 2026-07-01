"use client";

import { type FormEvent, type InputHTMLAttributes, type ReactNode, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type AdminAuthIconName = "arrow-left" | "chart" | "clipboard" | "lock" | "mail" | "shield" | "users";

type AdminAuthHighlight = {
  icon: Extract<AdminAuthIconName, "chart" | "clipboard" | "shield" | "users">;
  title: string;
  copy: string;
};

const adminAuthHighlights: AdminAuthHighlight[] = [
  {
    icon: "shield",
    title: "Secure access",
    copy: "Enterprise-grade authentication and session protection.",
  },
  {
    icon: "users",
    title: "Role-based access",
    copy: "Granular permissions for every team member.",
  },
  {
    icon: "chart",
    title: "Operational insights",
    copy: "Track vendor readiness and content quality at a glance.",
  },
  {
    icon: "clipboard",
    title: "Audit & activity logs",
    copy: "Every action is logged for full accountability.",
  },
];

export function AdminAuthIcon({ name }: { name: AdminAuthIconName }) {
  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3.25 19 6v5.35c0 4.15-2.76 7.8-7 9.4-4.24-1.6-7-5.25-7-9.4V6l7-2.75Z" />
        <path d="m9.2 12.1 1.8 1.8 3.95-4.2" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8.8 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
        <path d="M2.9 19.2c.52-3.26 2.72-5.2 5.9-5.2 3.19 0 5.38 1.94 5.9 5.2" />
        <path d="M16.25 11.15a2.65 2.65 0 1 0 0-5.3" />
        <path d="M15.6 14.1c2.86.16 4.72 1.88 5.22 5.1" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 20V9.8" />
        <path d="M10 20V5" />
        <path d="M15 20v-7.2" />
        <path d="M20 20V8" />
        <path d="M3.2 20h18" />
      </svg>
    );
  }

  if (name === "clipboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8.5 4.5h7l1.25 2.1H19a1.8 1.8 0 0 1 1.8 1.8v10.3a1.8 1.8 0 0 1-1.8 1.8H5a1.8 1.8 0 0 1-1.8-1.8V8.4A1.8 1.8 0 0 1 5 6.6h2.25L8.5 4.5Z" />
        <path d="M8 11h8" />
        <path d="M8 15h6" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4.75 6.75h14.5v10.5H4.75z" />
        <path d="m5.25 7.4 6.75 5.25 6.75-5.25" />
      </svg>
    );
  }

  if (name === "arrow-left") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14.75 6.25 9 12l5.75 5.75" />
        <path d="M9.4 12h10.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7.5 10.25h9v8.5h-9z" />
      <path d="M9.25 10.25V8.1a2.75 2.75 0 0 1 5.5 0v2.15" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.75 12s2.9-5.25 8.25-5.25S20.25 12 20.25 12s-2.9 5.25-8.25 5.25S3.75 12 3.75 12Z" />
      <path d="M12 14.35a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7Z" />
      {hidden ? <path d="m4.5 4.5 15 15" /> : null}
    </svg>
  );
}

export function AdminAuthBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "admin-login-brand compact" : "admin-login-brand"}>
      <Image
        src="/branding/localman-brand-icon.png"
        alt=""
        width={74}
        height={74}
        className="admin-login-brand-mark"
        aria-hidden="true"
        priority={!compact}
      />
      <div className="admin-login-wordmark" role="img" aria-label="Localman App">
        <span>
          LOCAL<span>MAN</span>
        </span>
        <strong>APP</strong>
      </div>
    </div>
  );
}

export function AdminAuthLayout({
  children,
  formLabel,
}: {
  children: ReactNode;
  formLabel: string;
}) {
  return (
    <main className="admin-login-page-shell">
      <section className="admin-login-hero-panel" aria-label="Admin workspace overview">
        <div className="admin-login-hero-copy">
          <AdminAuthBrand />
          <div className="admin-login-hero-heading">
            <p className="admin-login-hero-title">Admin workspace</p>
            <p>Manage vendors, ensure quality, and publish with confidence.</p>
          </div>
        </div>

        <div className="admin-login-illustration" aria-hidden="true">
          <svg viewBox="0 0 660 170" fill="none">
            <path d="M8 145H652" />
            <path d="M55 145V91c0-17 10-29 22-29s22 12 22 29v54" />
            <path d="M146 145V56h66v89" />
            <path d="M156 56v-13h46v13" />
            <path d="M164 83h12v18h-12zM190 83h12v18h-12zM164 114h12v18h-12zM190 114h12v18h-12z" />
            <path d="M300 145v-44h88v44" />
            <path d="M292 101c6-23 16-35 52-35s46 12 52 35" />
            <path d="M334 145v-28h28v28" />
            <path d="M461 145V68h62v77" />
            <path d="M493 68V44" />
            <path d="M476 89h12v18h-12zM500 89h12v18h-12zM476 119h12v18h-12zM500 119h12v18h-12z" />
            <path d="M558 145v-56h84v56" />
            <path d="M550 89c5-18 16-28 50-28s45 10 50 28" />
            <path d="M589 145v-28h24v28" />
            <path d="M255 49c0 25-18 25-18 47 0-22-18-22-18-47a18 18 0 1 1 36 0Z" />
            <path d="M237 112v8M237 129v5" />
            <path d="M603 51c8-9 22-9 30 0h12c6 0 11 5 11 11H583c0-6 5-11 11-11h9Z" />
          </svg>
        </div>

        <ul className="admin-login-highlight-list" aria-label="Admin security and operations features">
          {adminAuthHighlights.map((item) => (
            <li key={item.title}>
              <span className="admin-login-highlight-icon" aria-hidden="true">
                <AdminAuthIcon name={item.icon} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-login-form-panel" aria-label={formLabel}>
        {children}
      </section>
    </main>
  );
}

export function AdminAuthCard({
  children,
  description,
  onSubmit,
  title,
}: {
  children: ReactNode;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
}) {
  return (
    <form className="admin-login-card" onSubmit={onSubmit}>
      <div className="admin-login-card-header">
        <AdminAuthBrand compact />
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </form>
  );
}

function UtilityIcon({ children }: { children: ReactNode }) {
  return (
    <span className="admin-login-utility-icon" aria-hidden="true">
      {children}
    </span>
  );
}

export function AdminAuthFields({ children }: { children: ReactNode }) {
  return <div className="admin-login-fields">{children}</div>;
}

type AdminAuthFieldProps = {
  icon: AdminAuthIconName;
  id: string;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function AdminAuthField({ icon, id, label, ...inputProps }: AdminAuthFieldProps) {
  return (
    <label className="admin-login-field" htmlFor={id}>
      <span>{label}</span>
      <span className="admin-login-input-shell">
        <UtilityIcon>
          <AdminAuthIcon name={icon} />
        </UtilityIcon>
        <input id={id} {...inputProps} />
      </span>
    </label>
  );
}

export function AdminAuthPasswordField({ id, label, ...inputProps }: Omit<AdminAuthFieldProps, "icon">) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="admin-login-field" htmlFor={id}>
      <span>{label}</span>
      <span className="admin-login-input-shell">
        <UtilityIcon>
          <AdminAuthIcon name="lock" />
        </UtilityIcon>
        <input id={id} type={showPassword ? "text" : "password"} {...inputProps} />
        <button
          className="admin-login-password-toggle"
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          disabled={inputProps.disabled}
          onClick={() => setShowPassword((current) => !current)}
        >
          <EyeIcon hidden={showPassword} />
        </button>
      </span>
    </label>
  );
}

export function AdminAuthFormLinks({ children }: { children?: ReactNode }) {
  return (
    <div className="admin-login-form-links">
      <span aria-hidden="true" />
      {children}
    </div>
  );
}

export function AdminAuthMessage({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "error" | "success";
}) {
  return (
    <div className="admin-login-error-slot" aria-live="polite">
      <p className={tone === "error" ? "runtime-error" : "success-copy"}>{children}</p>
    </div>
  );
}

export function AdminAuthSubmitButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button className="admin-login-submit" disabled={disabled} type="submit">
      <AdminAuthIcon name="lock" />
      <span>{children}</span>
    </button>
  );
}

export function AdminAuthSecondaryAction({
  children,
  href,
  icon,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  icon?: AdminAuthIconName;
  onClick?: () => void;
}) {
  const content = (
    <>
      {icon ? <AdminAuthIcon name={icon} /> : null}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link className="admin-login-secondary-action" href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className="admin-login-secondary-action" type="button" onClick={onClick}>
      {content}
    </button>
  );
}

export function AdminAuthDivider() {
  return (
    <div className="admin-login-divider">
      <span />
      <strong>or</strong>
      <span />
    </div>
  );
}

export function AdminAuthSecurityNotice({
  children = "Your session is protected with enterprise-grade security.",
  title = "Secure connection",
}: {
  children?: ReactNode;
  title?: string;
}) {
  return (
    <div className="admin-login-security-note">
      <span aria-hidden="true">
        <AdminAuthIcon name="shield" />
      </span>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function getPasswordStrength(password: string): { label: string; score: number } {
  if (!password) {
    return { label: "Password strength", score: 0 };
  }

  const checks = [
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (score <= 2) {
    return { label: "Weak", score };
  }

  if (score <= 4) {
    return { label: "Good", score };
  }

  return { label: "Strong", score };
}

export function AdminPasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  return (
    <div
      className="admin-auth-password-strength"
      data-strength={strength.score}
      aria-live="polite"
      aria-label={`Password strength: ${strength.label}`}
    >
      <div aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} data-active={index < strength.score ? "true" : "false"} />
        ))}
      </div>
      <p>{strength.label}</p>
    </div>
  );
}
