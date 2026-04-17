import { test as setup, expect } from "@playwright/test"

// Captures Clerk session cookies for reuse across the rest of the suite.
//
// Clerk's test-mode sign-in uses its email-code flow. In CI we rely on
// `+clerk_test` addresses which auto-generate the verification code `424242`
// (see Clerk docs). Locally, set E2E_PROFESSIONAL_EMAIL / E2E_PROFESSIONAL_CODE
// in .env.local to point at any real test identity.

const EMAIL = process.env.E2E_PROFESSIONAL_EMAIL ?? "pro+clerk_test@test.corepro.app"
const CODE = process.env.E2E_PROFESSIONAL_CODE ?? "424242"

const AUTH_FILE = "./tests/.auth/professional.json"

setup("authenticate as professional", async ({ page }) => {
  await page.goto("/sign-in")

  // Fill the email-code form. Selectors follow Clerk's data-localization-key
  // attributes which are stable across versions.
  await page.getByLabel(/email/i).fill(EMAIL)
  await page.getByRole("button", { name: /continue/i }).click()

  await page.getByRole("textbox", { name: /code/i }).first().fill(CODE)

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
