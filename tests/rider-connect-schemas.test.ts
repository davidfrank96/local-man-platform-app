import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  adminRiderSchema,
  publicRiderSuggestionSchema,
  riderApplicationRequestSchema,
  riderApplicationResponseDataSchema,
  riderContactHandoffResponseDataSchema,
  riderContactHandoffRequestSchema,
  riderPaymentNoteTypeSchema,
  riderSchema,
  riderSuggestionsResponseDataSchema,
  riderUnavailableReportRequestSchema,
  riderVerificationStatusSchema,
  riderVisibilityStatusSchema,
  updateAdminRiderRequestSchema,
} from "../lib/validation/schemas.ts";

const riderConnectMigrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260517090000_rider_connect_schema.sql",
);

test("rider status schemas accept only the intended lifecycle values", () => {
  assert.equal(riderVerificationStatusSchema.safeParse("pending").success, true);
  assert.equal(riderVerificationStatusSchema.safeParse("verified").success, true);
  assert.equal(riderVerificationStatusSchema.safeParse("rejected").success, true);
  assert.equal(riderVerificationStatusSchema.safeParse("approved").success, false);

  assert.equal(riderVisibilityStatusSchema.safeParse("hidden").success, true);
  assert.equal(riderVisibilityStatusSchema.safeParse("visible").success, true);
  assert.equal(riderVisibilityStatusSchema.safeParse("suspended").success, true);
  assert.equal(riderVisibilityStatusSchema.safeParse("public").success, false);
});

test("public rider suggestion cards reject raw contact fields", () => {
  const baseSuggestion = {
    rider_id: "11111111-1111-4111-8111-111111111111",
    display_name: "Amina Rider",
    photo_url: null,
    vehicle_type: "bike",
    operating_areas: ["Wuse", "Garki"],
    usual_availability_label: "Usually available afternoons",
  };

  assert.equal(publicRiderSuggestionSchema.safeParse(baseSuggestion).success, true);
  assert.equal(
    publicRiderSuggestionSchema.safeParse({
      ...baseSuggestion,
      phone: "+2348000000000",
    }).success,
    false,
  );
  assert.equal(
    publicRiderSuggestionSchema.safeParse({
      ...baseSuggestion,
      whatsapp_phone: "+2348000000000",
    }).success,
    false,
  );
  assert.equal(
    publicRiderSuggestionSchema.safeParse({
      ...baseSuggestion,
      operating_areas: undefined,
    }).success,
    false,
  );

  assert.equal(
    riderSuggestionsResponseDataSchema.safeParse({
      vendor_slug: "open-evening-grill",
      riders: [baseSuggestion],
    }).success,
    true,
  );
});

test("contact handoff schema requires current contact details and accepted disclaimer", () => {
  const validRequest = {
    riderId: "11111111-1111-4111-8111-111111111111",
    customerName: "Ada",
    customerPhone: "+2348000000000",
    deliveryLocationMode: "manual_address",
    deliveryAddress: "12 Ademola Adetokunbo Crescent",
    deliveryArea: "Wuse 2",
    orderNote: "Please help coordinate pickup directly.",
    paymentNoteType: "coordinate_directly",
    disclaimerAccepted: true,
  };

  assert.equal(riderContactHandoffRequestSchema.safeParse(validRequest).success, true);
  assert.equal(
    riderContactHandoffRequestSchema.safeParse({
      ...validRequest,
      disclaimerAccepted: false,
    }).success,
    false,
  );
  assert.equal(
    riderContactHandoffRequestSchema.safeParse({
      ...validRequest,
      customerPhone: "not-a-phone",
    }).success,
    false,
  );
  assert.equal(
    riderContactHandoffRequestSchema.safeParse({
      ...validRequest,
      paymentNoteType: "localman_collects_payment",
    }).success,
    false,
  );
  assert.equal(
    riderContactHandoffRequestSchema.safeParse({
      ...validRequest,
      deliveryAddress: "",
      deliveryArea: "",
    }).success,
    false,
  );
});

test("contact handoff response exposes only safe selected-rider fields", () => {
  const safeResponse = {
    intent_id: "22222222-2222-4222-8222-222222222222",
    whatsapp_url: "https://wa.me/2348000000000?text=hello",
    rider: {
      rider_id: "11111111-1111-4111-8111-111111111111",
      display_name: "Amina Rider",
      photo_url: null,
      vehicle_type: "bike",
      operating_areas: ["Wuse"],
      usual_availability_label: "Usually available afternoons",
    },
  };

  assert.equal(riderContactHandoffResponseDataSchema.safeParse(safeResponse).success, true);
  assert.equal(
    riderContactHandoffResponseDataSchema.safeParse({
      ...safeResponse,
      whatsapp_phone: "+2348000000000",
    }).success,
    false,
  );
  assert.equal(
    riderContactHandoffResponseDataSchema.safeParse({
      ...safeResponse,
      rider: {
        ...safeResponse.rider,
        phone: "+2348000000000",
      },
    }).success,
    false,
  );
});

test("rider database schema keeps private contact fields separate from public cards", () => {
  const baseRider = {
    id: "11111111-1111-4111-8111-111111111111",
    display_name: "Amina Rider",
    full_name: "Amina Musa",
    phone: "+2348000000000",
    whatsapp_phone: "+2348000000001",
    photo_url: null,
    vehicle_type: "bike",
    plate_number: null,
    operating_areas: ["Wuse"],
    usual_available_hours: {
      label: "Usually available afternoons",
    },
    verification_status: "verified",
    visibility_status: "visible",
    notes: null,
    consent_accepted_at: "2026-05-17T10:00:00.000Z",
    created_at: "2026-05-17T10:00:00.000Z",
    updated_at: "2026-05-17T10:00:00.000Z",
  };

  assert.equal(riderSchema.safeParse(baseRider).success, true);
  assert.equal(
    adminRiderSchema.safeParse({
      ...baseRider,
      contact_intent_count: 2,
      unavailable_report_count: 1,
    }).success,
    true,
  );
});

test("admin rider update schema allows only managed profile and status fields", () => {
  assert.equal(
    updateAdminRiderRequestSchema.safeParse({
      display_name: "Amina Rider",
      phone: "+2348000000000",
      whatsapp_phone: "+2348000000001",
      operating_areas: ["Wuse", "Garki"],
      usual_available_hours: "Weekdays 10 AM - 7 PM",
      verification_status: "verified",
      visibility_status: "visible",
      notes: "Reviewed by admin.",
    }).success,
    true,
  );
  assert.equal(
    updateAdminRiderRequestSchema.safeParse({
      verification_status: "approved",
    }).success,
    false,
  );
  assert.equal(
    updateAdminRiderRequestSchema.safeParse({
      photo_url: "https://example.com/rider.jpg",
      visibility_status: "visible",
    }).success,
    false,
  );
  assert.equal(updateAdminRiderRequestSchema.safeParse({}).success, false);
});

test("unavailable report request schema accepts only supported reasons", () => {
  const validReport = {
    riderId: "11111111-1111-4111-8111-111111111111",
    vendorId: "22222222-2222-4222-8222-222222222222",
    reason: "no_response",
    reporterPhone: "+2348000000000",
  };

  assert.equal(riderUnavailableReportRequestSchema.safeParse(validReport).success, true);
  assert.equal(
    riderUnavailableReportRequestSchema.safeParse({
      ...validReport,
      reason: "late_delivery_refund",
    }).success,
    false,
  );
});

test("rider connect migration keeps public Data API access fail-closed", () => {
  const migration = readFileSync(riderConnectMigrationPath, "utf8");

  assert.match(migration, /alter table public\.riders enable row level security;/);
  assert.match(migration, /alter table public\.rider_contact_intents enable row level security;/);
  assert.match(migration, /alter table public\.rider_unavailable_reports enable row level security;/);
  assert.match(migration, /create policy "Admins can manage riders"/);
  assert.match(migration, /grant select, insert, update, delete on table\s+public\.riders to authenticated;/);
  assert.match(
    migration,
    /grant select, insert, update, delete on table\s+public\.riders,\s+public\.rider_contact_intents,\s+public\.rider_unavailable_reports\s+to service_role;/,
  );
  assert.doesNotMatch(migration, /\bgrant\b[\s\S]*\bto\s+anon\b/i);
});

test("payment note contract stays limited to direct coordination states", () => {
  assert.equal(riderPaymentNoteTypeSchema.safeParse("coordinate_directly").success, true);
  assert.equal(riderPaymentNoteTypeSchema.safeParse("already_paid_vendor").success, true);
  assert.equal(riderPaymentNoteTypeSchema.safeParse("pay_vendor_on_pickup").success, true);
  assert.equal(riderPaymentNoteTypeSchema.safeParse("cash_on_delivery").success, true);
  assert.equal(riderPaymentNoteTypeSchema.safeParse("localman_escrow").success, false);
});

test("rider application schema requires consent, disclaimer, and public-safe input", () => {
  const validApplication = {
    displayName: "Amina Rider",
    fullName: "Amina Musa",
    phone: "+2348000000000",
    whatsappPhone: "+2348000000001",
    vehicleType: "Bike",
    plateNumber: "",
    operatingAreas: ["Wuse", "Garki"],
    usualAvailableHours: "Weekdays 10 AM - 7 PM",
    consentAccepted: true,
    independentRiderDisclaimerAccepted: true,
  };

  assert.equal(riderApplicationRequestSchema.safeParse(validApplication).success, true);
  assert.equal(
    riderApplicationRequestSchema.safeParse({
      ...validApplication,
      consentAccepted: false,
    }).success,
    false,
  );
  assert.equal(
    riderApplicationRequestSchema.safeParse({
      ...validApplication,
      independentRiderDisclaimerAccepted: false,
    }).success,
    false,
  );
  assert.equal(
    riderApplicationRequestSchema.safeParse({
      ...validApplication,
      phone: "invalid",
    }).success,
    false,
  );
  assert.equal(
    riderApplicationRequestSchema.safeParse({
      ...validApplication,
      operatingAreas: [],
    }).success,
    false,
  );
});

test("rider application response schema exposes only review status", () => {
  assert.equal(
    riderApplicationResponseDataSchema.safeParse({
      received: true,
      review_status: "pending_review",
      verification_status: "pending",
      visibility_status: "hidden",
      message: "Application received.",
    }).success,
    true,
  );
  assert.equal(
    riderApplicationResponseDataSchema.safeParse({
      received: true,
      review_status: "approved",
      verification_status: "verified",
      visibility_status: "visible",
      message: "Visible.",
      phone: "+2348000000000",
    }).success,
    false,
  );
});
