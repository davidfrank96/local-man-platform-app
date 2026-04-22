import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell narrow-shell">
      <p className="eyebrow">Not found</p>
      <h1>Page unavailable</h1>
      <p className="page-intro">
        The requested Local Man route does not exist yet.
      </p>
      <Link className="button-primary inline-link" href="/">
        Return home
      </Link>
    </main>
  );
}
