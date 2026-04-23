export default function Loading() {
  return (
    <main className="public-shell" aria-busy="true">
      <section className="discovery-layout" aria-labelledby="discovery-title">
        <div className="discovery-sidebar">
          <div className="discovery-heading">
            <p className="eyebrow">Abuja pilot</p>
            <h1 id="discovery-title">Loading…</h1>
            <p>Preparing nearby vendor results.</p>
          </div>
          <section className="location-panel">
            <div>
              <strong>Resolving location</strong>
              <span>Location access starts automatically.</span>
            </div>
            <button className="button-secondary compact-button" type="button" disabled>
              Retry location
            </button>
          </section>
          <section className="vendor-results">
            <div className="result-heading">
              <strong>0 vendors</strong>
              <span>Loading…</span>
            </div>
            <p className="empty-state">Loading search results…</p>
          </section>
        </div>
        <div className="discovery-main">
          <section className="discovery-map waiting-map" aria-label="Nearby vendor map">
            <strong>Resolving map location</strong>
          </section>
          <section className="selected-vendor-panel">
            <p className="eyebrow">Selected vendor</p>
            <h2>Loading…</h2>
            <p>Preparing vendor details.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
