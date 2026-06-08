import test from "node:test";
import assert from "node:assert/strict";

import {
  OFFICIAL_PRIVACY_POLICY_LAST_UPDATED,
  OFFICIAL_PRIVACY_POLICY_SECTIONS,
} from "../components/about/privacy-policy-data.ts";

test("official privacy policy data exposes the required sections", () => {
  assert.equal(OFFICIAL_PRIVACY_POLICY_LAST_UPDATED, "June 05, 2026");
  assert.equal(OFFICIAL_PRIVACY_POLICY_SECTIONS.length, 14);

  assert.deepEqual(
    OFFICIAL_PRIVACY_POLICY_SECTIONS.map((section) => section.title),
    [
      "Summary of Key Points",
      "What Information Do We Collect?",
      "How Do We Process Your Information?",
      "When and With Whom Do We Share Your Information?",
      "Cookies and Tracking Technologies",
      "How Long Do We Keep Your Information?",
      "How Do We Keep Your Information Safe?",
      "Do We Collect Information From Minors?",
      "Privacy Rights",
      "Do-Not-Track Controls",
      "Region-Specific Rights",
      "Policy Updates",
      "Contact",
      "Review, Update, or Delete Your Data",
    ],
  );
});

test("official privacy policy data keeps required contact and legal details", () => {
  const serialized = JSON.stringify(OFFICIAL_PRIVACY_POLICY_SECTIONS);

  assert.match(serialized, /LocalManApp/);
  assert.match(serialized, /localmanapp@gmail\.com/);
  assert.match(serialized, /localmanapp\.com/);
  assert.match(serialized, /data subject access request/);
  assert.match(serialized, /We do not process sensitive personal information/);
  assert.match(serialized, /Do-Not-Track/);
});

test("official privacy policy data excludes raw Termly markup and editor artifacts", () => {
  const serialized = JSON.stringify(OFFICIAL_PRIVACY_POLICY_SECTIONS);

  assert.doesNotMatch(serialized, /<style/i);
  assert.doesNotMatch(serialized, /data:image\/svg\+xml;base64/i);
  assert.doesNotMatch(serialized, /<bdt/i);
  assert.doesNotMatch(serialized, /data-custom-class/i);
  assert.doesNotMatch(serialized, /Use something simple and clear/i);
  assert.doesNotMatch(serialized, /Privacy Policy Generator/i);
});
