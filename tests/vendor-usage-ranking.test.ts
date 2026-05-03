import assert from "node:assert/strict";
import test from "node:test";
import { fetchVendorUsageScores } from "../lib/vendors/supabase.ts";

test("fetchVendorUsageScores uses the aggregate RPC and normalizes scores", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));

    assert.equal(url.pathname, "/rest/v1/rpc/get_vendor_usage_scores");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body ?? "{}")), {
      vendor_ids: ["vendor-1", "vendor-2"],
    });

    return Response.json([
      { vendor_id: "vendor-1", ranking_score: 17.9 },
      { vendor_id: "vendor-2", ranking_score: -4 },
      { vendor_id: "", ranking_score: 9 },
    ]);
  }) as typeof fetch;

  try {
    const scores = await fetchVendorUsageScores(
      ["vendor-1", "vendor-1", "vendor-2"],
      {
        url: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
      },
    );

    assert.equal(scores.get("vendor-1"), 17);
    assert.equal(scores.get("vendor-2"), 0);
    assert.equal(scores.size, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchVendorUsageScores falls back to raw event aggregation when the RPC is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    requestCount += 1;

    if (requestCount === 1) {
      assert.equal(url.pathname, "/rest/v1/rpc/get_vendor_usage_scores");
      assert.equal(init?.method, "POST");

      return new Response("[]", { status: 404 });
    }

    assert.equal(url.pathname, "/rest/v1/user_events");
    assert.equal(url.searchParams.get("select"), "vendor_id,event_type");
    assert.equal(
      url.searchParams.get("vendor_id"),
      "in.(vendor-1,vendor-2)",
    );
    assert.equal(
      url.searchParams.get("event_type"),
      "in.(vendor_selected,vendor_detail_opened,directions_clicked,call_clicked)",
    );
    assert.equal(url.searchParams.get("limit"), "1000");
    assert.equal(url.searchParams.get("offset"), "0");

    return Response.json([
      { vendor_id: "vendor-1", event_type: "vendor_selected" },
      { vendor_id: "vendor-1", event_type: "call_clicked" },
      { vendor_id: "vendor-2", event_type: "directions_clicked" },
      { vendor_id: null, event_type: "call_clicked" },
      { vendor_id: "vendor-2", event_type: null },
    ]);
  }) as typeof fetch;

  try {
    const scores = await fetchVendorUsageScores(["vendor-1", "vendor-2"], {
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role-key",
    });

    assert.equal(scores.get("vendor-1"), 9);
    assert.equal(scores.get("vendor-2"), 5);
    assert.equal(scores.size, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchVendorUsageScores returns empty scores when config is unavailable", async () => {
  const scores = await fetchVendorUsageScores(["vendor-1"], null);

  assert.equal(scores.size, 0);
});
