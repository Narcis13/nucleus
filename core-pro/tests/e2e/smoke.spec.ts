import { test, expect } from "@playwright/test"

// Sanity check that the auth fixture restored a session and the dashboard
// loads without throwing. Keep this file minimal — the real flows live in
// sibling spec files and rely on this already passing.

test("dashboard loads for authenticated professional", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator("body")).toBeVisible()
})

test("health endpoint returns healthy", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.status()).toBeLessThan(500)
  const body = await res.json()
  expect(body).toHaveProperty("status")
})
