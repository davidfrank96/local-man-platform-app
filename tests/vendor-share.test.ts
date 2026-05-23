import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVendorShareMessage,
  buildVendorShareUrl,
  buildVendorWhatsAppShareUrl,
  getVendorNativeShareData,
} from "../lib/vendors/share.ts";

test("vendor share helper builds canonical vendor profile URLs", () => {
  assert.equal(
    buildVendorShareUrl({
      origin: "https://localman.example/some/path?utm_source=test",
      vendorSlug: "jabi-office-lunch-bowl",
    }),
    "https://localman.example/vendors/jabi-office-lunch-bowl",
  );
});

test("vendor share helper rejects malformed share inputs", () => {
  assert.throws(
    () =>
      buildVendorShareUrl({
        origin: "https://localman.example",
        vendorSlug: "../admin",
      }),
    /Invalid vendor slug/,
  );
  assert.throws(
    () =>
      buildVendorShareUrl({
        origin: "not a url",
        vendorSlug: "jabi-office-lunch-bowl",
      }),
    /Invalid share origin/,
  );
});

test("vendor share helper generates native share data without tracking params", () => {
  const shareData = getVendorNativeShareData({
    origin: "http://localhost:3000/vendor/current?x=1",
    vendorName: "  Jabi   Office Lunch Bowl  ",
    vendorSlug: "jabi-office-lunch-bowl",
  });

  assert.equal(shareData.title, "Jabi Office Lunch Bowl on Localman");
  assert.equal(shareData.url, "http://localhost:3000/vendors/jabi-office-lunch-bowl");
  assert.equal(
    shareData.text,
    "Check out Jabi Office Lunch Bowl on Localman: http://localhost:3000/vendors/jabi-office-lunch-bowl",
  );
});

test("vendor share helper generates encoded WhatsApp share links", () => {
  const vendorUrl = "https://localman.example/vendors/jabi-office-lunch-bowl";
  const whatsappUrl = new URL(
    buildVendorWhatsAppShareUrl({
      vendorName: "Jabi Office Lunch Bowl",
      vendorUrl,
    }),
  );

  assert.equal(whatsappUrl.origin, "https://wa.me");
  assert.equal(
    whatsappUrl.searchParams.get("text"),
    buildVendorShareMessage("Jabi Office Lunch Bowl", vendorUrl),
  );
});
