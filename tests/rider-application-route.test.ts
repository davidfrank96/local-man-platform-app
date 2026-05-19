import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { POST as submitRiderApplication } from "../app/api/riders/apply/route.ts";
import { resetAbuseProtectionStateForTests } from "../lib/api/abuse-protection.ts";

const validApplication = {
  displayName: "Amina Rider",
  fullName: "Amina Musa",
  phone: "+2348000000000",
  whatsappPhone: "+2348000000001",
  vehicleType: "Bike",
  plateNumber: "ABC-123XY",
  operatingAreas: ["Wuse", "Garki"],
  usualAvailableHours: "Weekdays 10 AM - 7 PM",
  consentAccepted: true,
  independentRiderDisclaimerAccepted: true,
};

function setRiderApplicationEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  return () => {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    }
  };
}

function createApplicationRequest(body: unknown): Request {
  return new Request("http://localhost/api/riders/apply", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("rider application route rejects missing required fields before writing", async () => {
  resetAbuseProtectionStateForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("Fetch should not be called for invalid rider applications.");
  }) as typeof fetch;

  try {
    const response = await submitRiderApplication(
      createApplicationRequest({
        ...validApplication,
        displayName: "",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  } finally {
    globalThis.fetch = originalFetch;
    resetAbuseProtectionStateForTests();
  }
});

test("rider application route requires consent and independent-rider disclaimer", async () => {
  resetAbuseProtectionStateForTests();

  const response = await submitRiderApplication(
    createApplicationRequest({
      ...validApplication,
      consentAccepted: false,
      independentRiderDisclaimerAccepted: false,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(JSON.stringify(body.error.details), /consentAccepted/);
  assert.match(JSON.stringify(body.error.details), /independentRiderDisclaimerAccepted/);
});

test("rider application route rejects invalid phone values", async () => {
  resetAbuseProtectionStateForTests();

  const response = await submitRiderApplication(
    createApplicationRequest({
      ...validApplication,
      phone: "not-a-phone",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(JSON.stringify(body.error.details), /phone/);
});

test("rider application route stores applications as hidden and pending only", async () => {
  resetAbuseProtectionStateForTests();
  const restoreEnv = setRiderApplicationEnv();
  const originalFetch = globalThis.fetch;
  const writes: Array<{
    url: URL;
    init?: RequestInit;
    body: Record<string, unknown>;
  }> = [];

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    writes.push({ url, init, body });

    assert.equal(url.pathname, "/rest/v1/riders");
    assert.equal(init?.method, "POST");

    return new Response(null, { status: 201 });
  }) as typeof fetch;

  try {
    const response = await submitRiderApplication(createApplicationRequest(validApplication));
    const body = await response.json();
    const write = writes[0];

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, {
      received: true,
      review_status: "pending_review",
      verification_status: "pending",
      visibility_status: "hidden",
      message:
        "Application received. Localman may review your details before any rider profile becomes visible.",
    });
    assert.equal(body.data.phone, undefined);
    assert.equal(body.data.whatsapp_phone, undefined);
    assert.equal(writes.length, 1);
    assert.ok(write);
    assert.equal(write.init?.headers && (write.init.headers as Record<string, string>).apikey, "service-role-key");
    assert.equal(write.body.display_name, "Amina Rider");
    assert.equal(write.body.full_name, "Amina Musa");
    assert.equal(write.body.phone, "+2348000000000");
    assert.equal(write.body.whatsapp_phone, "+2348000000001");
    assert.deepEqual(write.body.operating_areas, ["Wuse", "Garki"]);
    assert.deepEqual(write.body.usual_available_hours, {
      label: "Weekdays 10 AM - 7 PM",
    });
    assert.equal(write.body.verification_status, "pending");
    assert.equal(write.body.visibility_status, "hidden");
    assert.equal(typeof write.body.consent_accepted_at, "string");
    assert.equal("photo_url" in write.body, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
    resetAbuseProtectionStateForTests();
  }
});

test("rider application route returns safe upstream errors without service details", async () => {
  resetAbuseProtectionStateForTests();
  const restoreEnv = setRiderApplicationEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({ message: "permission denied for table riders" }, { status: 403 })) as typeof fetch;

  try {
    const response = await submitRiderApplication(createApplicationRequest(validApplication));
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.success, false);
    assert.equal(body.error.message, "Unable to submit rider application.");
    assert.doesNotMatch(JSON.stringify(body), /permission denied/i);
    assert.doesNotMatch(JSON.stringify(body), /service-role-key/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
    resetAbuseProtectionStateForTests();
  }
});

test("rider application page documents current MVP boundaries and omits forbidden fields", () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), "app/riders/apply/page.tsx"),
    "utf8",
  );
  const formSource = readFileSync(
    resolve(process.cwd(), "components/public/rider-application-form.tsx"),
    "utf8",
  );
  const combined = `${pageSource}\n${formSource}`;

  assert.match(combined, /Apply to be listed as an independent rider on Localman/);
  assert.match(combined, /Localman does not employ riders/);
  assert.match(combined, /does not guarantee jobs/);
  assert.match(combined, /does not collect or process\s+delivery payments/);
  assert.match(combined, /I agree that Localman may store my rider profile details/);
  assert.match(combined, /I understand that I am applying as an independent rider/);
  assert.doesNotMatch(combined, /name="photo/i);
  assert.doesNotMatch(combined, /name="nin/i);
  assert.doesNotMatch(combined, /name="bvn/i);
  assert.doesNotMatch(combined, /name="bank/i);
  assert.doesNotMatch(combined, /name="payment/i);
  assert.doesNotMatch(combined, /name="password/i);
  assert.doesNotMatch(combined, /become a Localman employee/i);
  assert.doesNotMatch(
    combined,
    new RegExp(["official", "Localman", "driver"].join("\\s+"), "i"),
  );
  assert.doesNotMatch(combined, /guaranteed jobs/i);
});
