"use client";

import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ reset }: ErrorProps) {
  return (
    <main className="page-shell narrow-shell" aria-live="polite">
      <p className="eyebrow">Error</p>
      <h1>Something went wrong</h1>
      <p className="page-intro">
        The page failed to load. Try again or return home.
      </p>
      <div className="action-row">
        <button className="button-primary" type="button" onClick={() => reset()}>
          Try again
        </button>
        <Link className="button-secondary" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
