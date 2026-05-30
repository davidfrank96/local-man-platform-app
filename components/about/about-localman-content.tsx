"use client";

import { useState, type ReactNode } from "react";

export type AboutLocalmanSection =
  | "using"
  | "mission"
  | "install"
  | "terms"
  | "privacy";

type AboutLocalmanContentProps = {
  className?: string;
  idPrefix: string;
  rootTestId?: string;
  supportEmail: string;
  testIdPrefix: string;
  titleId: string;
  websiteUrl: string;
};

type AboutLocalmanAccordionSection = {
  key: AboutLocalmanSection;
  title: string;
  renderContent: (supportEmail: string) => ReactNode;
};

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const aboutLocalmanAccordionSections: AboutLocalmanAccordionSection[] = [
  {
    key: "using",
    title: "Using Localman",
    renderContent: () => (
      <>
        <h3>Discover vendors</h3>
        <p>
          Use Home to browse nearby vendors. Search by vendor name, filter
          results, adjust your search radius, and open vendor profiles when
          you need more details.
        </p>
        <h3>Use the map</h3>
        <p>
          Switch to Map for location context. Refresh the map when you need
          updated nearby results, then tap vendors from the map or list views.
        </p>
        <h3>Check vendor details</h3>
        <p>
          Vendor profiles show useful information, direct call links,
          directions, sharing, and rating options.
        </p>
        <h3>Request a rider</h3>
        <p>
          When you need delivery help, complete the rider request form and
          choose from available riders. Suggestions depend on rider
          availability, and WhatsApp is used to coordinate directly with the
          selected rider.
        </p>
        <h3>Share ratings</h3>
        <p>
          Rate your experience and add optional rating signals when they fit.
          Your feedback helps improve discovery quality.
        </p>
      </>
    ),
  },
  {
    key: "mission",
    title: "Why Localman Exists",
    renderContent: () => (
      <>
        <h3>Discover local</h3>
        <p>
          Localman exists to help people discover useful local vendors around
          them, from structured businesses to informal businesses, roadside
          vendors, and local service providers.
        </p>
        <h3>Support local communities</h3>
        <p>
          The goal is to connect users, vendors, and independent riders in a
          simple way that improves visibility and access for the community.
        </p>
        <h3>Independent riders</h3>
        <p>
          Riders are independent participants who help users coordinate
          deliveries. Localman is not a dispatch company and does not employ
          riders.
        </p>
        <h3>No platform fees right now</h3>
        <p>
          Localman currently does not charge vendors, riders, or customers.
          Business remains business-as-usual, and vendors are not expected to
          provide special pricing, special treatment, or special access because
          of Localman.
        </p>
        <h3>Trust and safety</h3>
        <p>
          Localman recognizes that platform abuse exists. The platform keeps
          improving privacy protections, abuse prevention, rider protections,
          vendor protections, and user protections while keeping the experience
          simple.
        </p>
        <h3>Future</h3>
        <p>
          Localman&apos;s long-term mission is to make local discovery easier,
          more accessible, and more community-focused.
        </p>
      </>
    ),
  },
  {
    key: "install",
    title: "Install Localman as an App",
    renderContent: () => (
      <>
        <p>
          You can add Localman to your phone home screen and open it
          like a regular app.
        </p>
        <h3>Android</h3>
        <ol>
          <li>Open Localman in Chrome.</li>
          <li>Tap the three-dot menu in the top-right corner.</li>
          <li>Tap &quot;Install app&quot; or &quot;Add to Home screen.&quot;</li>
          <li>Confirm by tapping &quot;Install&quot; or &quot;Add.&quot;</li>
          <li>Open Localman from your home screen.</li>
        </ol>
        <h3>iPhone / iOS</h3>
        <ol>
          <li>Open Localman in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Scroll and tap &quot;Add to Home Screen.&quot;</li>
          <li>Confirm the name and tap &quot;Add.&quot;</li>
          <li>Open Localman from your home screen.</li>
        </ol>
        <p>
          On iPhone, use Safari for Add to Home Screen. Other browsers
          may not show the same option.
        </p>
      </>
    ),
  },
  {
    key: "terms",
    title: "Terms of Use",
    renderContent: (supportEmail) => (
      <>
        <p>
          By using Localman, you agree to use the platform lawfully and
          responsibly.
        </p>
        <ul>
          <li>
            Localman helps people discover local food and everyday vendors.
            Vendor details, prices, hours, menus, and availability can change,
            so confirm important details with the vendor.
          </li>
          <li>
            Rider Connect is lightweight coordination with independent riders.
            Localman is not a rideshare, logistics, employment, or dispatch
            company and does not guarantee delivery or rider performance.
          </li>
          <li>
            WhatsApp handoff happens outside Localman. You are responsible for
            the details you share and any agreement you make with a vendor or
            rider.
          </li>
          <li>
            Ratings and feedback should be honest. Do not submit false,
            abusive, spammy, or misleading information.
          </li>
          <li>
            Localman may change, pause, or interrupt parts of the service and
            does not guarantee uninterrupted access.
          </li>
          <li>
            To the fullest extent allowed by law, Localman is not responsible
            for vendor pricing, food quality, rider conduct, delays, outages,
            or decisions made outside the platform.
          </li>
          <li>
            These terms may be updated over time. For support, email{" "}
            <a href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    key: "privacy",
    title: "Privacy Policy",
    renderContent: () => (
      <>
        <p>
          Localman uses information to operate vendor discovery, rider
          coordination, ratings, sharing, admin management, and abuse
          prevention.
        </p>
        <ul>
          <li>
            Localman may handle vendor information, rider information,
            admin-entered data, rider request details, ratings and signals,
            approximate location or selected area, and browser or device data.
          </li>
          <li>
            Full rider phone or WhatsApp details are not shown publicly before
            handoff. Full rider plates are not exposed publicly; a masked plate
            may appear after rider selection. Internal notes are not public.
          </li>
          <li>
            Continuing to WhatsApp opens a service outside Localman, with its
            own privacy practices. Necessary contact and request details may be
            shared with the selected rider for coordination.
          </li>
          <li>
            Localman keeps information as needed for platform operation,
            support, admin records, abuse prevention, and legal or safety
            reasons. Exact retention periods may vary.
          </li>
          <li>
            You can choose not to submit rider request details. Vendors and
            riders may request updates or removal through the available support
            or admin process.
          </li>
          <li>
            Localman uses reasonable protections, but no internet service can
            guarantee perfect security.
          </li>
          <li>
            Localman is not intended for children. Minors should use the
            platform only with a parent or guardian.
          </li>
          <li>This policy may be updated as Localman grows.</li>
        </ul>
      </>
    ),
  },
];

export function AboutLocalmanContent({
  className = "mobile-about-view",
  idPrefix,
  rootTestId,
  supportEmail,
  testIdPrefix,
  titleId,
  websiteUrl,
}: AboutLocalmanContentProps) {
  const [openSection, setOpenSection] = useState<AboutLocalmanSection | null>(null);

  return (
    <section
      className={className}
      data-testid={rootTestId}
      aria-labelledby={titleId}
    >
      <p className="eyebrow">About Localman</p>
      <h2 id={titleId}>Find useful vendors near you.</h2>
      <p>
        Localman helps you search nearby food and everyday vendors, compare who is open,
        preview them on the map, and open details for calls or directions.
      </p>
      <div className="mobile-about-card">
        <strong>How to use it</strong>
        <p>Search or filter vendors on Home, switch to Map for location context, then open a vendor for details.</p>
      </div>
      <div className="mobile-about-card">
        <strong>Support</strong>
        <p>
          Need help or want to list a vendor? Email{" "}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
        <a href={websiteUrl} rel="noreferrer" target="_blank">
          Visit Localman
        </a>
      </div>
      <div className="mobile-about-legal" aria-label="Localman information">
        <p className="mobile-about-legal-note">
          These summaries are provided to explain how Localman works. They may be
          updated as the platform grows.
        </p>
        <div className="mobile-about-legal-accordion">
          {aboutLocalmanAccordionSections.map((section) => {
            const contentId = `${idPrefix}-${section.key}-content`;
            const isExpanded = openSection === section.key;

            return (
              <section className="mobile-about-legal-section" key={section.key}>
                <button
                  aria-controls={contentId}
                  aria-expanded={isExpanded}
                  className="mobile-about-legal-trigger"
                  data-testid={`${testIdPrefix}-${section.key}-toggle`}
                  type="button"
                  onClick={() =>
                    setOpenSection((current) =>
                      current === section.key ? null : section.key,
                    )
                  }
                >
                  <span>{section.title}</span>
                  <ChevronIcon />
                </button>
                <div
                  className="mobile-about-legal-content"
                  data-testid={`${testIdPrefix}-${section.key}-content`}
                  hidden={!isExpanded}
                  id={contentId}
                >
                  {section.renderContent(supportEmail)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
