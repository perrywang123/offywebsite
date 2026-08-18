import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produce a self-hostable, minimal server (used by the Dockerfile).
  output: "standalone",
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
