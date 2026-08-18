import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-hostable, minimal server (used by the Dockerfile).
  // Also works on Vercel, which uses its own build pipeline.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
