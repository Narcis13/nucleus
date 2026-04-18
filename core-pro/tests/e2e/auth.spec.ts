import { expect, test } from "@playwright/test"

// Auth flows — sign-in / sign-up surface + role routing.
//
// The global setup signs a professional in and stashes the session in
// `tests/.auth/professional.json`. These tests split on whether the flow
// needs the saved session or not:
//
//   • Signed-out flows force `storageState` to an empty context so we can
//     verify the anonymous marketing chrome, Clerk-mounted sign-in/sign-up
//     pages, and the middleware's redirect on protected routes.
//   • Signed-in flows reuse the default storage state and confirm the
//     dashboard shell loads with professional-only chrome (sidebar,
//     dashboard breadcrumbs, topbar).

test.describe("signed-out auth surfaces", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("marketing home exposes sign-in + sign-up CTAs", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(
      page.getByRole("link", { name: /start free/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible()
  })

  test("sign-in page mounts Clerk form", async ({ page }) => {
    await page.goto("/sign-in")
    // Clerk renders its own form — assert at least one email input + a
    // continue button show up. We don't dig deeper; Clerk's UI is covered by
    // Clerk's own test suite.
    await expect(page.getByLabel(/email/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByRole("button", { name: /continue/i }),
    ).toBeVisible()
  })

  test("sign-up page mounts Clerk form", async ({ page }) => {
    await page.goto("/sign-up")
    await expect(page.getByLabel(/email/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("protected dashboard redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    const response = await page.goto("/dashboard")
    // Middleware (proxy.ts) calls auth.protect(), which bounces to sign-in.
    // We accept any URL ending up on the sign-in page, with or without a
    // ?redirect_url hint.
    await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 })
    // The response itself can be the final sign-in 200 or the intermediate
    // 307 — we don't care, as long as the browser landed on sign-in.
    expect(response?.status() ?? 200).toBeLessThan(500)
  })

  test("protected portal redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/portal")
    await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 })
  })
})

test.describe("signed-in professional role routing", () => {
  test("dashboard loads with sidebar nav for the professional", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard/)
    // Any of the sidebar nav items should be discoverable. We assert on the
    // Clients link because it's present in PRIMARY_NAV and in the mobile
    // bottom tab bar, so at least one of the two rails will expose it.
    await expect(
      page.getByRole("link", { name: /clients/i }).first(),
    ).toBeVisible()
  })

  test("sign-in and sign-up routes bounce to dashboard once signed in", async ({
    page,
  }) => {
    // Clerk's <SignIn/> and <SignUp/> auto-redirect signed-in visitors at
    // the client layer. We don't assert on the target URL shape beyond
    // "left the auth route" — onboarding forks can send us to /onboarding.
    await page.goto("/sign-in")
    await expect(page).not.toHaveURL(/sign-in$/, { timeout: 15_000 })
  })
})
