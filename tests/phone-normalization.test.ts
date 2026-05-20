import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNigerianPhoneForDisplay,
  getNigerianPhoneStorageVariants,
  getNigerianPhoneTelHref,
  normalizeNigerianPhoneNumber,
} from "../lib/phone.ts";
import { createVendorRequestSchema } from "../lib/validation/schemas.ts";

test("Nigerian phone normalization accepts local and country-code formats", () => {
  assert.equal(normalizeNigerianPhoneNumber("08065990331"), "2348065990331");
  assert.equal(normalizeNigerianPhoneNumber("+2348065990331"), "2348065990331");
  assert.equal(normalizeNigerianPhoneNumber("2348065990331"), "2348065990331");
  assert.equal(normalizeNigerianPhoneNumber("+234 806 599 0331"), "2348065990331");
  assert.equal(normalizeNigerianPhoneNumber("0806-599-0331"), "2348065990331");
});

test("Nigerian phone normalization rejects malformed values", () => {
  assert.equal(normalizeNigerianPhoneNumber("8065990331"), null);
  assert.equal(normalizeNigerianPhoneNumber("23408065990331"), null);
  assert.equal(normalizeNigerianPhoneNumber("2342348065990331"), null);
  assert.equal(normalizeNigerianPhoneNumber("080659903310"), null);
  assert.equal(normalizeNigerianPhoneNumber("not-a-phone"), null);
});

test("Nigerian phone helpers produce display, tel, and duplicate-check variants", () => {
  assert.equal(formatNigerianPhoneForDisplay("08065990331"), "+2348065990331");
  assert.equal(getNigerianPhoneTelHref("08065990331"), "tel:+2348065990331");
  assert.deepEqual(getNigerianPhoneStorageVariants("+2348065990331"), [
    "2348065990331",
    "+2348065990331",
    "08065990331",
  ]);
});

test("vendor create validation normalizes Nigerian phone numbers before storage", () => {
  const parsed = createVendorRequestSchema.parse({
    name: "Phone Test Vendor",
    slug: "phone-test-vendor",
    short_description: null,
    phone_number: "08065990331",
    address_text: "Wuse Market",
    city: "Abuja",
    area: "Wuse",
    state: "FCT",
    country: "Nigeria",
    latitude: 9.0813,
    longitude: 7.4694,
    price_band: "budget",
    is_active: true,
    is_open_override: null,
  });

  assert.equal(parsed.phone_number, "2348065990331");
  assert.equal(
    createVendorRequestSchema.safeParse({
      ...parsed,
      phone_number: "not-a-phone",
    }).success,
    false,
  );
});
