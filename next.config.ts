import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produce a self-hostable, minimal server (used by the Dockerfile).
  output: "standalone",
  /**
   * `src/lib/geo.ts` 在拿不到国家头时会用 geoip-lite 按访客 IP 解析国家。
   * 这个库的数据是**运行时从磁盘读**的:它用 `path.resolve(__dirname, "../data")`
   * 找 .dat 文件。被 Turbopack 打进 server bundle 后 `__dirname` 会变成虚拟路径
   * (`/ROOT/node_modules/...`),import 阶段就 ENOENT —— 现象是每个请求都 500。
   * 声明成外部依赖,让它按真实路径从 node_modules 里 require。
   */
  serverExternalPackages: ["geoip-lite"],
  /**
   * 光外部化还不够:standalone 的文件追踪只跟 import/require 走,看不到
   * `fs.openSync(geoip-city.dat)` 这种运行时读取,所以那 ~115MB 数据文件不会被
   * 复制进 `.next/standalone` —— 本地 `pnpm dev` 一切正常,容器里却查谁都是
   * undefined(甚至因为 geoip-lite 在 import 期就同步读数据而直接起不来)。
   */
  outputFileTracingIncludes: {
    "/**": ["node_modules/geoip-lite/**"],
  },
  poweredByHeader: false,
  images: {
    // Shopify product images are served from the Shopify CDN.
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
};

export default withNextIntl(nextConfig);
