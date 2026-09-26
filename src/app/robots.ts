import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/zh/checkout", "/en/checkout", "/zh/cart", "/en/cart"],
    },
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  };
}
