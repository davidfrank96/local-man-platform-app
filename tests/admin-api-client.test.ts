import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminVendor,
  listAdminVendors,
} from "../lib/admin/api-client.ts";

const vendorId = "00000000-0000-4000-8000-000000000001";

test("admin API client sends bearer token and query params", async () => {
  const requestedUrls: string[] = [];
  const requestedHeaders: Headers[] = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requestedUrls.push(String(input));
    requestedHeaders.push(new Headers(init?.headers));

    return Response.json({
      success: true,
      data: {
        vendors: [
          {
            id: vendorId,
            name: "Test Vendor",
            slug: "test-vendor",
            short_description: "Test vendor",
            phone_number: "+2340000000000",
            area: "Wuse",
            latitude: 9.0813,
            longitude: 7.4694,
            price_band: "budget",
            average_rating: 0,
            review_count: 0,
            is_active: true,
            is_open_override: null,
          },
        ],
        pagination: {
          limit: 50,
          offset: 0,
          count: 1,
        },
      },
      error: null,
    });
  }) as typeof fetch;

  const result = await listAdminVendors(
    {
      search: "rice",
      area: "Wuse",
      is_active: true,
      price_band: "budget",
    },
    {
      accessToken: "admin-token",
      fetchImpl,
    },
  );
  const url = new URL(requestedUrls[0], "http://localhost");

  assert.equal(result.vendors[0].id, vendorId);
  assert.equal(requestedHeaders[0].get("authorization"), "Bearer admin-token");
  assert.equal(url.pathname, "/api/admin/vendors");
  assert.equal(url.searchParams.get("search"), "rice");
  assert.equal(url.searchParams.get("area"), "Wuse");
  assert.equal(url.searchParams.get("is_active"), "true");
  assert.equal(url.searchParams.get("price_band"), "budget");
});

test("admin API client throws standard API errors", async () => {
  const fetchImpl = (async () =>
    Response.json(
      {
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Admin token is required.",
        },
      },
      { status: 401 },
    )) as typeof fetch;

  await assert.rejects(
    () =>
      createAdminVendor(
        {
          name: "Test Vendor",
          slug: "test-vendor",
          short_description: null,
          phone_number: null,
          address_text: null,
          city: "Abuja",
          area: "Wuse",
          state: "FCT",
          country: "Nigeria",
          latitude: 9.0813,
          longitude: 7.4694,
          price_band: "budget",
          is_active: true,
          is_open_override: null,
        },
        {
          accessToken: "bad-token",
          fetchImpl,
        },
      ),
    /UNAUTHORIZED: Admin token is required\./,
  );
});

test("admin API client reports non-json failures clearly", async () => {
  const fetchImpl = (async () =>
    new Response("Service unavailable", {
      status: 503,
    })) as typeof fetch;

  await assert.rejects(
    () =>
      listAdminVendors(
        {},
        {
          accessToken: "admin-token",
          fetchImpl,
        },
      ),
    /HTTP_ERROR: API request failed with status 503/,
  );
});

test("admin API client reports malformed API responses clearly", async () => {
  const fetchImpl = (async () =>
    Response.json({
      data: null,
    })) as typeof fetch;

  await assert.rejects(
    () =>
      listAdminVendors(
        {},
        {
          accessToken: "admin-token",
          fetchImpl,
        },
      ),
    /INVALID_RESPONSE: API returned an unexpected response shape/,
  );
});
