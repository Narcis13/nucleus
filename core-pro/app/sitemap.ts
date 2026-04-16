import type { MetadataRoute } from "next"

import { listPublishedSlugs } from "@/lib/db/queries/micro-sites"
import { env } from "@/lib/env"

// ─────────────────────────────────────────────────────────────────────────────
// App sitemap — combines the static marketing pages with every published
// micro-site slug. Runs at request time (revalidated alongside the sites
// themselves) so freshly-published sites show up in search indexes without
// waiting for a redeploy.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]

  let sites: MetadataRoute.Sitemap = []
  try {
    const rows = await listPublishedSlugs()
    sites = rows.map((r) => ({
      url: `${base}/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }))
  } catch {
    // DB unreachable at request time — fall back to just the static entries
    // rather than fail the whole sitemap.
  }

  return [...staticEntries, ...sites]
}
