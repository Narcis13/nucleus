import { expect, test } from "@playwright/test"

// Invoices — stats strip, list, builder dialog, PDF endpoint.
//
// The dashboard/invoices page renders a 4-card stats strip + the invoice
// list. The PDF endpoint (`/api/invoices/:id/pdf`) is authenticated by RLS:
// a caller without access to the invoice gets a 404, and a bogus UUID gets
// a 400. We test both shapes here since no seed invoice is guaranteed.

test.describe("invoices dashboard", () => {
  test("renders header and four stat cards", async ({ page }) => {
    await page.goto("/dashboard/invoices")
    await expect(
      page.getByRole("heading", { level: 1, name: /invoices/i }),
    ).toBeVisible()

    // Stat labels are stable — "Outstanding", "Overdue", "Paid this month",
    // "Avg. days to pay". Check a couple of the more distinctive ones.
    await expect(page.getByText(/outstanding/i).first()).toBeVisible()
    await expect(page.getByText(/paid this month/i).first()).toBeVisible()
  })

  test("new-invoice builder opens when triggered", async ({ page }) => {
    await page.goto("/dashboard/invoices")
    const trigger = page
      .getByRole("button", { name: /new invoice|create invoice/i })
      .first()
    if (!(await trigger.isVisible())) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "No 'New invoice' trigger visible on this breakpoint.",
      })
      test.skip()
    }
    await trigger.click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})

test.describe("invoice pdf endpoint", () => {
  test("rejects non-uuid id with 400", async ({ request }) => {
    const res = await request.get("/api/invoices/not-a-uuid/pdf")
    expect(res.status()).toBe(400)
  })

  test("returns 404 for a well-formed but unknown invoice", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/invoices/00000000-0000-4000-8000-000000000000/pdf",
    )
    // 404 is the preferred contract; 401/403 are also acceptable if RLS
    // layers intercept before the null-check returns.
    expect([401, 403, 404]).toContain(res.status())
  })
})
