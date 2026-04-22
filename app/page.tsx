import Link from "next/link";
import { focusAreas, primaryActions } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-layout" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">Abuja pilot</p>
          <h1 id="home-title">The Local Man</h1>
          <p className="hero-text">
            A map-first discovery platform for nearby local food vendors,
            starting with Abuja neighborhoods and admin-curated listings.
          </p>
          <div className="action-row" aria-label="Primary placeholders">
            {primaryActions.map((action) => (
              <Link
                className={action.variant === "primary" ? "button-primary" : "button-secondary"}
                href={action.href}
                key={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="map-preview" aria-label="Placeholder map preview">
          <div className="map-toolbar">
            <span>Map placeholder</span>
            <span>Open now</span>
          </div>
          <div className="map-grid">
            <span className="map-pin map-pin-one" />
            <span className="map-pin map-pin-two" />
            <span className="map-pin map-pin-three" />
          </div>
          <div className="vendor-strip">
            <strong>Nearby vendors</strong>
            <span>Cards, filters, calls, and directions come next.</span>
          </div>
        </div>
      </section>

      <section className="content-band" aria-labelledby="focus-title">
        <div>
          <p className="eyebrow">Initial focus areas</p>
          <h2 id="focus-title">Pilot neighborhoods</h2>
        </div>
        <ul className="area-list">
          {focusAreas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
