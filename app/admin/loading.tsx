export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true">
      <p className="eyebrow">Admin</p>
      <h1>Loading…</h1>
      <p className="page-intro">Preparing the admin workspace.</p>
      <div className="admin-console">
        <section className="admin-panel">
          <strong>Loading admin controls…</strong>
          <p>Waiting for the workspace to become ready.</p>
        </section>
      </div>
    </main>
  );
}
