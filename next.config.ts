import type { NextConfig } from "next";

function buildContentSecurityPolicy(): string {
  const directives = [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["object-src", "'none'"],
    ["frame-ancestors", "'none'"],
    ["form-action", "'self'"],
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["font-src", "'self'", "data:"],
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
      "https://api.maptiler.com",
      "https://*.maptiler.com",
      "https://*.tile.openstreetmap.org",
    ],
    [
      "connect-src",
      "'self'",
      "https://*.supabase.co",
      "https://api.maptiler.com",
      "https://*.maptiler.com",
      "https://nominatim.openstreetmap.org",
    ],
    ["worker-src", "'self'", "blob:"],
    ["child-src", "'none'"],
    ["frame-src", "'none'"],
  ];

  return directives.map(([name, ...values]) => `${name} ${values.join(" ")}`).join("; ");
}

const nextConfig: NextConfig = {
  // Local smoke checks and some operator workflows use 127.0.0.1 instead of
  // localhost. Allow that dev origin so Turbopack HMR and chunk requests are
  // not blocked by Next's cross-site development guard.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    const headers = [
      {
        key: "Content-Security-Policy",
        value: buildContentSecurityPolicy(),
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
