"use client";

import { useState } from "react";

import {
  OFFICIAL_PRIVACY_POLICY_LAST_UPDATED,
  OFFICIAL_PRIVACY_POLICY_SECTIONS,
  type PrivacyPolicyBlock,
} from "./privacy-policy-data.ts";

type PrivacyPolicyContentProps = {
  idPrefix: string;
  testIdPrefix: string;
};

function PrivacyChevronIcon() {
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

function PolicyLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {label}
    </a>
  );
}

function renderPolicyBlock(block: PrivacyPolicyBlock, index: number) {
  if (block.type === "paragraph") {
    return <p key={index}>{block.text}</p>;
  }

  if (block.type === "bullets") {
    return (
      <ul key={index}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <p key={index}>
      {block.prefix}
      <PolicyLink href={block.href} label={block.label} />
      {block.suffix}
    </p>
  );
}

export function PrivacyPolicyContent({
  idPrefix,
  testIdPrefix,
}: PrivacyPolicyContentProps) {
  const [openSectionKeys, setOpenSectionKeys] = useState<Set<string>>(
    () => new Set(),
  );

  return (
    <div className="official-privacy-policy" data-testid={`${testIdPrefix}-privacy-policy`}>
      <div className="official-privacy-policy-intro">
        <h3>Privacy Policy</h3>
        <p className="official-privacy-policy-date">
          Last updated: {OFFICIAL_PRIVACY_POLICY_LAST_UPDATED}
        </p>
        <p>
          LocalManApp explains how it collects, uses, stores, and shares
          information when people use Localman services.
        </p>
        <p>
          This official policy covers LocalManApp,{" "}
          <PolicyLink href="https://localmanapp.com" label="localmanapp.com" />
          , the Localman application, and related services. For privacy
          questions, email{" "}
          <PolicyLink
            href="mailto:localmanapp@gmail.com"
            label="localmanapp@gmail.com"
          />
          .
        </p>
      </div>

      <nav
        aria-label="Privacy Policy table of contents"
        className="official-privacy-policy-toc"
      >
        <strong>Policy sections</strong>
        <ol>
          {OFFICIAL_PRIVACY_POLICY_SECTIONS.map((section) => (
            <li key={section.key}>{section.title}</li>
          ))}
        </ol>
      </nav>

      <div className="official-privacy-policy-sections">
        {OFFICIAL_PRIVACY_POLICY_SECTIONS.map((section) => {
          const contentId = `${idPrefix}-privacy-${section.key}-content`;
          const isExpanded = openSectionKeys.has(section.key);

          return (
            <section className="official-privacy-policy-section" key={section.key}>
              <button
                aria-controls={contentId}
                aria-expanded={isExpanded}
                className="official-privacy-policy-trigger"
                data-testid={`${testIdPrefix}-privacy-${section.key}-toggle`}
                type="button"
                onClick={() => {
                  setOpenSectionKeys((current) => {
                    const next = new Set(current);
                    if (next.has(section.key)) {
                      next.delete(section.key);
                    } else {
                      next.add(section.key);
                    }

                    return next;
                  });
                }}
              >
                <span>
                  <strong>{section.title}</strong>
                  <small>{section.summary}</small>
                </span>
                <PrivacyChevronIcon />
              </button>
              <div
                className="official-privacy-policy-content"
                data-testid={`${testIdPrefix}-privacy-${section.key}-content`}
                hidden={!isExpanded}
                id={contentId}
              >
                {section.blocks.map(renderPolicyBlock)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
