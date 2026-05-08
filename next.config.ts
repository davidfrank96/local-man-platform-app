import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local smoke checks and some operator workflows use 127.0.0.1 instead of
  // localhost. Allow that dev origin so Turbopack HMR and chunk requests are
  // not blocked by Next's cross-site development guard.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
