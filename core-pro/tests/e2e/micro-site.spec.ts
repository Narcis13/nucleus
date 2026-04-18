import { expect, test } from "@playwright/test"

// Micro-site — builder chrome, public page rendering, 404 for unknown slugs.
//
// The public `/[slug]` route is SSG with ISR (`revalidate = 600`) and
// renders based on the professional's `micro_site` config. Without a seeded
// site we can't render a happy-path slug; we instead prove the unknown-slug
// path 404s cleanly (notFound() -> Next's default 404 page).
//
// The site builder dashboard is visible to any professional — it
// `ensureMicroSite`s on first visit, so this is always a safe render.

test.describe("site builder dashboard", () => {
  test("renders editor chrome + public URL preview", async ({ page }) => {
    await page.goto("/dashboard/site-builder")
    await expect(
      page.getByRole("heading", { level: 1, name: /site builder/i }),
    ).toBeVisible()

    // The editor exposes the public URL (read-only). It lives in the header
    // with the slug appended. We verify at least one link/input referencing
    // the app origin is present.
    const baseUrl = new URL(
      (test.info().config.projects[0]?.use?.baseURL as string | undefined) ??
        "http://localhost:3000",
    )
    const origin = `${baseUrl.protocol}//${baseUrl.host}`
    const refsOrigin = page.locator(`text=${origin}`).first()
    await expect(refsOrigin).toBeVisible({ timeout: 15_000 })
  })
})

test.describe("public micro-site", () => {
  test("unknown slug 404s without throwing", async ({ page }) => {
    const res = await page.goto("/this-slug-does-not-exist-and-never-will")
    // notFound() resolves to 404 for static params outside the published set.
    // Accept any 404; some hosts set 200 for streamed responses — in that
    // case assert the page content reports "not found".
    const status = res?.status() ?? 200
    if (status !== 404) {
      const body = (await page.locator("body").innerText()).toLowerCase()
      expect(body).toMatch(/not found|404/)
    } else {
      expect(status).toBe(404)
    }
  })
})
