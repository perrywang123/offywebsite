import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 英文站无前缀:`/checkout`、`/cart` 就是真实地址。
      // 旧的 `/en/checkout`、`/zh/checkout` 已由 middleware 308 收敛到这里,
      // 不需要单独列(它们不产生可索引的 200 页面)。
      disallow: ["/api/", "/checkout", "/cart"],
    },
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  };
}
