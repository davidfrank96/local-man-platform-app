import Link from "next/link";

export default function SearchPage() {
  return (
    <main className="page-shell narrow-shell">
      <p className="eyebrow">Public placeholder</p>
      <h1>Search local food</h1>
      <p className="page-intro">
        This route reserves the future search and filter experience for vendors,
        categories, distance, price band, and open-now state.
      </p>
      <div className="placeholder-panel">
        <span>Search UI placeholder</span>
        <span>Feature implementation begins after Phase 1 setup.</span>
      </div>
      <Link className="button-secondary inline-link" href="/">
        Back home
      </Link>
    </main>
  );
}
