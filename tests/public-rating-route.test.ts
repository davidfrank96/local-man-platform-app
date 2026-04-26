import assert from "node:assert/strict";
import test from "node:test";
import { POST as vendorRatingsRoute } from "../app/api/vendors/[slug]/ratings/route.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";

function setRatingEnv(): () => void {
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

test("public vendor ratings route saves a rating and returns updated summary", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({
      method,
      path: url.pathname,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json([
        {
          id: vendorId,
          slug: "test-vendor",
          average_rating: 4,
          review_count: 2,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/ratings" && method === "POST") {
      return new Response(null, { status: 201 });
    }

    if (url.pathname === "/rest/v1/ratings" && method === "GET") {
      return Response.json([{ score: 4 }, { score: 5 }, { score: 4 }]);
    }

    if (url.pathname === "/rest/v1/vendors" && method === "PATCH") {
      return new Response(null, { status: 204 });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const response = await vendorRatingsRoute(
      new Request("http://localhost/api/vendors/test-vendor/ratings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ score: 4 }),
      }),
      {
        params: Promise.resolve({ slug: "test-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, {
      vendor_id: vendorId,
      rating_summary: {
        average_rating: 4.33,
        review_count: 3,
      },
    });
    assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
      "GET /rest/v1/vendors",
      "POST /rest/v1/ratings",
      "GET /rest/v1/ratings",
      "PATCH /rest/v1/vendors",
    ]);
    assert.deepEqual(calls[1]?.body, {
      vendor_id: vendorId,
      score: 4,
      source_type: "public_simple_rating",
    });
    assert.deepEqual(calls[3]?.body, {
      average_rating: 4.33,
      review_count: 3,
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor ratings route rejects invalid scores", async () => {
  const restoreEnv = setRatingEnv();

  try {
    const response = await vendorRatingsRoute(
      new Request("http://localhost/api/vendors/test-vendor/ratings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ score: 7 }),
      }),
      {
        params: Promise.resolve({ slug: "test-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  } finally {
    restoreEnv();
  }
});

test("public vendor ratings route returns not found for unknown vendor", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json([])) as typeof fetch;

  try {
    const response = await vendorRatingsRoute(
      new Request("http://localhost/api/vendors/missing-vendor/ratings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ score: 5 }),
      }),
      {
        params: Promise.resolve({ slug: "missing-vendor" }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NOT_FOUND");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
