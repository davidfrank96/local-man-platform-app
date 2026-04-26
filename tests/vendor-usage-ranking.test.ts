import assert from "node:assert/strict";
import test from "node:test";
import { fetchVendorUsageScores } from "../lib/vendors/supabase.ts";

test("fetchVendorUsageScores applies deterministic event weights", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/user_events");
    assert.equal(
      url.searchParams.get("event_type"),
      "in.(vendor_selected,vendor_detail_opened,directions_clicked,call_clicked)",
    );

    return Response.json([
      { vendor_id: "vendor-1", event_type: "vendor_selected" },
      { vendor_id: "vendor-1", event_type: "vendor_detail_opened" },
      { vendor_id: "vendor-1", event_type: "directions_clicked" },
      { vendor_id: "vendor-1", event_type: "call_clicked" },
      { vendor_id: "vendor-2", event_type: "vendor_selected" },
      { vendor_id: "vendor-2", event_type: "vendor_selected" },
      { vendor_id: "vendor-2", event_type: "vendor_detail_opened" },
      { vendor_id: "vendor-3", event_type: "ignored_event" },
    ]);
  }) as typeof fetch;

  try {
    const scores = await fetchVendorUsageScores(
      ["vendor-1", "vendor-2", "vendor-3"],
      {
        url: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
      },
    );

    assert.equal(scores.get("vendor-1"), 17);
    assert.equal(scores.get("vendor-2"), 5);
    assert.equal(scores.get("vendor-3"), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchVendorUsageScores returns empty scores when config is unavailable", async () => {
  const scores = await fetchVendorUsageScores(["vendor-1"], null);

  assert.equal(scores.size, 0);
});
