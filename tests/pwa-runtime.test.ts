import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import nextConfig from "../next.config.ts";

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const serviceWorker = readRepoFile("public/sw.js");
const pwaRuntime = readRepoFile("components/system/pwa-runtime.tsx");
const offlinePage = readRepoFile("public/offline.html");

test("PWA runtime registers the service worker only for production-safe origins", () => {
  assert.match(pwaRuntime, /process\.env\.NODE_ENV !== "production"/);
  assert.match(pwaRuntime, /"serviceWorker" in navigator/);
  assert.match(pwaRuntime, /protocol === "https:"/);
  assert.match(pwaRuntime, /hostname === "localhost"/);
  assert.match(pwaRuntime, /hostname === "127\.0\.0\.1"/);
  assert.match(pwaRuntime, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(pwaRuntime, /scope: "\/"/);
  assert.match(pwaRuntime, /updateViaCache: "none"/);
});

test("service worker precaches only install and shell fallback assets", () => {
  const match = serviceWorker.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);

  assert.ok(match, "service worker should expose a small static precache list");

  const precacheBlock = match[1] ?? "";

  assert.match(serviceWorker, /const OFFLINE_URL = "\/offline\.html";/);
  assert.match(precacheBlock, /OFFLINE_URL/);
  assert.match(precacheBlock, /"\/manifest\.webmanifest"/);
  assert.match(precacheBlock, /"\/icons\/pwa-192x192\.png"/);
  assert.match(precacheBlock, /"\/icons\/pwa-512x512\.png"/);
  assert.doesNotMatch(precacheBlock, /\/api\//);
  assert.doesNotMatch(precacheBlock, /\/vendors\//);
  assert.doesNotMatch(precacheBlock, /\/search/);
  assert.doesNotMatch(precacheBlock, /rider/i);
  assert.doesNotMatch(precacheBlock, /rating/i);
  assert.doesNotMatch(precacheBlock, /nearby/i);
});

test("service worker bypasses marketplace, rider, rating, admin, and search data", () => {
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/admin"\)/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/vendors\/"\)/);
  assert.match(serviceWorker, /pathname === "\/search"/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /networkOnlyNavigation\(request\)/);
});

test("service worker caches only static asset request classes", () => {
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/_next\/static\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/icons\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/branding\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/seed-images\/"\)/);
  assert.match(serviceWorker, /request\.destination === "font"/);
  assert.match(serviceWorker, /request\.destination === "script"/);
  assert.match(serviceWorker, /request\.destination === "style"/);
  assert.doesNotMatch(serviceWorker, /\/_next\/image/);
});

test("service worker and offline fallback headers keep updates revalidating", async () => {
  const headersFn = nextConfig.headers;

  assert.equal(typeof headersFn, "function");
  if (typeof headersFn !== "function") {
    throw new Error("next.config.ts must define headers.");
  }

  const headerRules = await headersFn();
  const serviceWorkerRule = headerRules.find((rule) => rule.source === "/sw.js");
  const offlineRule = headerRules.find((rule) => rule.source === "/offline.html");

  assert.ok(serviceWorkerRule);
  assert.ok(offlineRule);

  const serviceWorkerHeaders = new Map(
    serviceWorkerRule.headers.map((header) => [header.key, header.value]),
  );
  const offlineHeaders = new Map(
    offlineRule.headers.map((header) => [header.key, header.value]),
  );

  assert.equal(
    serviceWorkerHeaders.get("Cache-Control"),
    "public, max-age=0, must-revalidate",
  );
  assert.equal(serviceWorkerHeaders.get("Service-Worker-Allowed"), "/");
  assert.equal(
    offlineHeaders.get("Cache-Control"),
    "public, max-age=0, must-revalidate",
  );
});

test("offline fallback states that live marketplace features need network", () => {
  assert.match(offlinePage, /You appear to be offline\./);
  assert.match(offlinePage, /Nearby vendors, rider availability, ratings, and search need a live network\./);
  assert.doesNotMatch(offlinePage, /cached vendors/i);
  assert.doesNotMatch(offlinePage, /last known vendor/i);
});
