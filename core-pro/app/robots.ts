import type { MetadataRoute } from "next"

import { env } from "@/lib/env"

// Robots policy: everything public is crawlable except for the authenticated
// app surface (dashboard / portal) and API / webhook endpoints. The sitemap
// URL is advertised so search engines pick up published micro-sites.
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/portal",
          "/portal/",
          "/api/",
          "/monitoring",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
