import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { z } from "zod";
import nextConfig from "../next.config.ts";
import { POST as trackEventRoute } from "../app/api/events/route.ts";
import { GET as reverseGeocodeRoute } from "../app/api/location/reverse/route.ts";
import { GET as categoriesRoute } from "../app/api/categories/route.ts";
import { GET as vendorDetailRoute } from "../app/api/vendors/[slug]/route.ts";
import {
  PUBLIC_REVERSE_GEOCODE_RATE_LIMIT,
  resetAbuseProtectionStateForTests,
} from "../lib/api/abuse-protection.ts";
import {
  DEFAULT_MAX_JSON_BODY_BYTES,
  validateJsonBody,
} from "../lib/api/validation.ts";
import { validateAdminUnsafeRequestOrigin } from "../lib/admin/origin.ts";
import { isAllowedPublicImageUrl } from "../lib/vendors/images.ts";

function setPublicEnv(): () => void {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  return () => {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }

    if (previousAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnonKey;
    }

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    }
  };
}

function overrideNodeEnvForTest(value: string): () => void {
  const previousDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");

  Object.defineProperty(process.env, "NODE_ENV", {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });

  return () => {
    if (previousDescriptor) {
      Object.defineProperty(process.env, "NODE_ENV", previousDescriptor);
      return;
    }

    Reflect.deleteProperty(process.env, "NODE_ENV");
  };
}

test.beforeEach(() => {
  resetAbuseProtectionStateForTests();
});

test("shared JSON validation rejects oversized bodies before schema validation", async () => {
  const result = await validateJsonBody(
    new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-length": "1024",
        "content-type": "application/json",
      },
      body: "{}",
    }),
    z.object({ ok: z.literal(true) }),
    { maxBytes: 8 },
  );

  assert.equal(result.success, false);

  if (!result.success) {
    assert.equal(result.response.status, 413);
    const body = await result.response.json();
    assert.equal(body.error.message, "Request body is too large.");
  }
});

test("public event route rejects oversized bodies without writing upstream", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("Fetch should not be called for oversized event payloads.");
  }) as typeof fetch;

  try {
    const response = await trackEventRoute(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-length": String(DEFAULT_MAX_JSON_BODY_BYTES + 1),
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.success, false);
    assert.equal(body.error.message, "Request body is too large.");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
    resetAbuseProtectionStateForTests();
  }
});

test("public upstream failures return sanitized error responses", async () => {
  const restoreEnv = setPublicEnv();
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = (async () => {
    throw new Error("permission denied for table vendor_categories using service-role-key");
  }) as typeof fetch;

  try {
    const categoriesResponse = await categoriesRoute(
      new Request("http://localhost/api/categories"),
    );
    const vendorResponse = await vendorDetailRoute(
      new Request("http://localhost/api/vendors/test-vendor"),
      {
        params: Promise.resolve({ slug: "test-vendor" }),
      },
    );
    const categoriesBody = await categoriesResponse.json();
    const vendorBody = await vendorResponse.json();
    const serialized = JSON.stringify({ categoriesBody, vendorBody });

    assert.equal(categoriesResponse.status, 502);
    assert.equal(vendorResponse.status, 502);
    assert.equal(categoriesBody.error.message, "Unable to fetch categories.");
    assert.equal(vendorBody.error.message, "Unable to fetch vendor detail.");
    assert.doesNotMatch(serialized, /permission denied/i);
    assert.doesNotMatch(serialized, /service-role-key/i);
  } finally {
    console.error = originalConsoleError;
    globalThis.fetch = originalFetch;
    restoreEnv();
    resetAbuseProtectionStateForTests();
  }
});

test("security headers are configured for app routes", async () => {
  const headersFn = nextConfig.headers;

  assert.equal(typeof headersFn, "function");
  if (typeof headersFn !== "function") {
    throw new Error("next.config.ts must define security headers.");
  }

  const headerRules = await headersFn();
  const headers = new Map(headerRules[0]?.headers.map((header) => [header.key, header.value]));
  const csp = headers.get("Content-Security-Policy") ?? "";

  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /https:\/\/\*\.supabase\.co/);
  assert.doesNotMatch(csp, /navigate-to/);
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("Permissions-Policy") ?? "", /geolocation=\(self\)/);
});

test("reverse geocode rejects out-of-range coordinates and rate limits excessive requests", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      address: {
        suburb: "Wuse",
        city: "Abuja",
      },
    })) as typeof fetch;

  try {
    const invalidResponse = await reverseGeocodeRoute(
      new Request("http://localhost/api/location/reverse?lat=120&lng=7.4"),
    );
    const invalidBody = await invalidResponse.json();

    assert.equal(invalidResponse.status, 400);
    assert.equal(invalidBody.error.code, "VALIDATION_ERROR");

    resetAbuseProtectionStateForTests();
    let lastResponse: Response | null = null;

    for (let index = 0; index <= PUBLIC_REVERSE_GEOCODE_RATE_LIMIT.maxRequests; index += 1) {
      lastResponse = await reverseGeocodeRoute(
        new Request("http://localhost/api/location/reverse?lat=9.08&lng=7.46", {
          headers: {
            "x-forwarded-for": "203.0.113.90",
          },
        }),
      );
    }

    assert.ok(lastResponse);
    assert.equal(lastResponse.status, 429);
  } finally {
    globalThis.fetch = originalFetch;
    resetAbuseProtectionStateForTests();
  }
});

test("admin unsafe requests reject cross-origin mutations but allow same-origin", async () => {
  const sameOrigin = validateAdminUnsafeRequestOrigin(
    new Request("http://localhost/api/admin/vendors", {
      method: "POST",
      headers: {
        origin: "http://localhost",
      },
    }),
  );
  const crossOrigin = validateAdminUnsafeRequestOrigin(
    new Request("http://localhost/api/admin/vendors", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
      },
    }),
  );

  assert.equal(sameOrigin, null);
  assert.ok(crossOrigin);
  assert.equal(crossOrigin.status, 403);
  assert.doesNotMatch(JSON.stringify(await crossOrigin.json()), /admin_users|service-role/i);
});

test("admin origin validation accepts production proxy origins without allowing cross-origin requests", async () => {
  const restoreNodeEnv = overrideNodeEnvForTest("production");
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  process.env.NEXT_PUBLIC_APP_URL = "https://local-man.example";

  try {
    const forwardedSameOrigin = validateAdminUnsafeRequestOrigin(
      new Request("http://127.0.0.1:8080/api/admin/login", {
        method: "POST",
        headers: {
          host: "127.0.0.1:8080",
          origin: "https://local-man.example",
          "x-forwarded-host": "local-man.example",
          "x-forwarded-proto": "https",
        },
      }),
    );
    const refererFallback = validateAdminUnsafeRequestOrigin(
      new Request("http://127.0.0.1:8080/api/admin/login", {
        method: "POST",
        headers: {
          host: "127.0.0.1:8080",
          referer: "https://local-man.example/admin/login",
          "x-forwarded-host": "local-man.example",
          "x-forwarded-proto": "https",
        },
      }),
    );
    const configuredAppOrigin = validateAdminUnsafeRequestOrigin(
      new Request("http://127.0.0.1:8080/api/admin/login", {
        method: "POST",
        headers: {
          host: "127.0.0.1:8080",
          origin: "https://local-man.example",
        },
      }),
    );
    const crossOrigin = validateAdminUnsafeRequestOrigin(
      new Request("http://127.0.0.1:8080/api/admin/login", {
        method: "POST",
        headers: {
          host: "127.0.0.1:8080",
          origin: "https://evil.example",
          "x-forwarded-host": "local-man.example",
          "x-forwarded-proto": "https",
        },
      }),
    );
    const missingOriginAndReferer = validateAdminUnsafeRequestOrigin(
      new Request("http://127.0.0.1:8080/api/admin/login", {
        method: "POST",
        headers: {
          host: "127.0.0.1:8080",
          "x-forwarded-host": "local-man.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    assert.equal(forwardedSameOrigin, null);
    assert.equal(refererFallback, null);
    assert.equal(configuredAppOrigin, null);
    assert.ok(crossOrigin);
    assert.equal(crossOrigin.status, 403);
    assert.ok(missingOriginAndReferer);
    assert.equal(missingOriginAndReferer.status, 403);
  } finally {
    restoreNodeEnv();

    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  }
});

test("Rider Connect hash secret is documented as server-only config", () => {
  const envExample = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
  const clientSources = [
    "components/public/rider-connect-modal.tsx",
    "components/public/rider-application-form.tsx",
    "lib/vendors/public-api-client.ts",
  ]
    .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
    .join("\n");

  assert.match(envExample, /^RIDER_CONNECT_HASH_SECRET=/m);
  assert.doesNotMatch(envExample, /^NEXT_PUBLIC_RIDER_CONNECT_HASH_SECRET=/m);
  assert.doesNotMatch(clientSources, /RIDER_CONNECT_HASH_SECRET/);
});

test("MapLibre debug hook is gated away from default production runtime", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/public/vendor-map-maplibre.tsx"),
    "utf8",
  );

  assert.match(source, /process\.env\.NODE_ENV === "production"/);
  assert.match(source, /NEXT_PUBLIC_LOCALMAN_ENABLE_MAP_DEBUG/);
});

test("public image URL allowlist rejects unknown external hosts", () => {
  assert.equal(
    isAllowedPublicImageUrl(
      "https://example.supabase.co/storage/v1/object/public/vendor-images/test/hero.jpg",
      { allowLocalPaths: false },
    ),
    true,
  );
  assert.equal(
    isAllowedPublicImageUrl("https://tracker.example.com/pixel.jpg", {
      allowLocalPaths: false,
    }),
    false,
  );
  assert.equal(
    isAllowedPublicImageUrl("/seed-images/vendors/test/cover.jpg"),
    false,
  );
});

test("reviewed user-content surfaces avoid raw HTML rendering sinks", () => {
  const files = [
    "components/public/vendor-detail.tsx",
    "components/public/rider-connect-modal.tsx",
    "components/admin/admin-logs-board.tsx",
    "components/admin/admin-activity-board.tsx",
    "components/admin/admin-rider-management.tsx",
  ];

  for (const file of files) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(source, /\.innerHTML\s*=/);
  }
});
