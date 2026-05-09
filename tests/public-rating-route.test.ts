import assert from "node:assert/strict";
import test from "node:test";
import { POST as vendorRatingsRoute } from "../app/api/vendors/[slug]/ratings/route.ts";
import {
  PUBLIC_RATING_RATE_LIMIT,
  resetAbuseProtectionStateForTests,
} from "../lib/api/abuse-protection.ts";

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

test.beforeEach(() => {
  resetAbuseProtectionStateForTests();
});

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
        },
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/submit_public_vendor_rating" && method === "POST") {
      return Response.json({
        vendor_id: vendorId,
        average_rating: 4.33,
        review_count: 3,
      });
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
      "POST /rest/v1/rpc/submit_public_vendor_rating",
    ]);
    assert.deepEqual(calls[1]?.body, {
      target_vendor_id: vendorId,
      target_score: 4,
      target_source_type: "public_simple_rating",
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

test("public vendor ratings route rejects malformed payloads", async () => {
  const restoreEnv = setRatingEnv();

  try {
    const response = await vendorRatingsRoute(
      new Request("http://localhost/api/vendors/test-vendor/ratings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
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

test("public vendor ratings route deduplicates sequential retry submissions", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;
  let ratingsInsertCount = 0;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json([
        {
          id: vendorId,
          slug: "test-vendor",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/submit_public_vendor_rating" && method === "POST") {
      ratingsInsertCount += 1;
      return Response.json({
        vendor_id: vendorId,
        average_rating: 4.33,
        review_count: 3,
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const createRequest = () =>
      new Request("http://localhost/api/vendors/test-vendor/ratings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.30",
        },
        body: JSON.stringify({ score: 4 }),
      });

    const firstResponse = await vendorRatingsRoute(createRequest(), {
      params: Promise.resolve({ slug: "test-vendor" }),
    });
    const secondResponse = await vendorRatingsRoute(createRequest(), {
      params: Promise.resolve({ slug: "test-vendor" }),
    });

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 200);
    assert.equal(ratingsInsertCount, 1);
    assert.deepEqual((await firstResponse.json()).data, (await secondResponse.json()).data);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor ratings route shares one upstream write across concurrent duplicate submissions", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;
  let ratingsInsertCount = 0;
  let resolveInsert: (() => void) | undefined;
  const insertReady = new Promise<void>((resolve) => {
    resolveInsert = resolve;
  });

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json([
        {
          id: vendorId,
          slug: "test-vendor",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/submit_public_vendor_rating" && method === "POST") {
      ratingsInsertCount += 1;
      await insertReady;
      return Response.json({
        vendor_id: vendorId,
        average_rating: 4.25,
        review_count: 4,
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    const createRequest = () =>
      new Request("http://localhost/api/vendors/test-vendor/ratings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.31",
        },
        body: JSON.stringify({ score: 5 }),
      });

    const firstPromise = vendorRatingsRoute(createRequest(), {
      params: Promise.resolve({ slug: "test-vendor" }),
    });
    const secondPromise = vendorRatingsRoute(createRequest(), {
      params: Promise.resolve({ slug: "test-vendor" }),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(resolveInsert);
    resolveInsert();

    const [firstResponse, secondResponse] = await Promise.all([firstPromise, secondPromise]);

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 200);
    assert.equal(ratingsInsertCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor ratings route rate limits repeated submissions from one client", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json([
        {
          id: vendorId,
          slug: "test-vendor",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/submit_public_vendor_rating" && method === "POST") {
      return Response.json({
        vendor_id: vendorId,
        average_rating: 4.33,
        review_count: 3,
      });
    }

    return Response.json({ message: "Unexpected request" }, { status: 500 });
  }) as typeof fetch;

  try {
    let lastResponse: Response | null = null;

    for (let index = 0; index <= PUBLIC_RATING_RATE_LIMIT.maxRequests; index += 1) {
      lastResponse = await vendorRatingsRoute(
        new Request("http://localhost/api/vendors/test-vendor/ratings", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.32",
          },
          body: JSON.stringify({ score: index % 2 === 0 ? 4 : 5 }),
        }),
        {
          params: Promise.resolve({ slug: "test-vendor" }),
        },
      );
    }

    assert.ok(lastResponse);
    const body = await lastResponse!.json();

    assert.equal(lastResponse!.status, 429);
    assert.equal(body.error.code, "TOO_MANY_REQUESTS");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor ratings route returns a controlled upstream error when the ratings RPC fails", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const errorCalls: Array<Record<string, unknown>> = [];

  console.error = ((record: unknown) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      errorCalls.push(record as Record<string, unknown>);
    }
  }) as typeof console.error;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/rest/v1/vendors" && method === "GET") {
      return Response.json([
        {
          id: vendorId,
          slug: "test-vendor",
        },
      ]);
    }

    if (url.pathname === "/rest/v1/rpc/submit_public_vendor_rating" && method === "POST") {
      return Response.json({ message: "rpc failed" }, { status: 500 });
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

    assert.equal(response.status, 502);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UPSTREAM_ERROR");

    const failureLog = errorCalls.find((record) => record.event === "PUBLIC_VENDOR_RATING_FAILED");

    assert.ok(failureLog);
    assert.equal(failureLog?.vendorSlug, "test-vendor");
    assert.equal(
      (failureLog?.metadata as Record<string, unknown> | undefined)?.score,
      4,
    );
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("public vendor ratings route returns a controlled upstream error when vendor lookup cannot reach the database", async () => {
  const restoreEnv = setRatingEnv();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new Error("connect ECONNREFUSED");
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

    assert.equal(response.status, 502);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UPSTREAM_ERROR");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
