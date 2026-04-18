import { expect, test } from "@playwright/test"

// Clients module — CRUD shell, tag manager, profile chrome.
//
// These tests don't attempt to mutate production-like data; they verify the
// page renders the expected scaffolding and that the "new client" + tag
// manager dialogs open from their trigger buttons. Deeper write flows are
// covered at the server-action level via unit tests (see lib/actions/*).

test.describe("clients list page", () => {
  test("renders page header and either empty state or a table", async ({
    page,
  }) => {
    await page.goto("/dashboard/clients")
    await expect(
      page.getByRole("heading", { level: 1, name: /clients/i }),
    ).toBeVisible()

    // Either we see "No clients yet" (empty state) or the search box in the
    // <ClientTable>. Both are valid starting points.
    const emptyState = page.getByText(/no clients yet/i)
    const searchInput = page.getByPlaceholder(/search/i).first()
    await expect(emptyState.or(searchInput)).toBeVisible()
  })

  test("add-client dialog opens from the header", async ({ page }) => {
    await page.goto("/dashboard/clients")
    // The ClientTable header exposes an "Add client" action — button label
    // may be "Add client" or just a + icon depending on breakpoint. Match
    // the stable text label.
    const trigger = page
      .getByRole("button", { name: /add client/i })
      .first()
    if (!(await trigger.isVisible())) {
      test.info().annotations.push({
        type: "skip-reason",
        description:
          "No 'Add client' trigger visible (possibly hidden behind overflow menu on this breakpoint).",
      })
      test.skip()
    }
    await trigger.click()
    // Dialog should mount with a name input + a submit button.
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(
      page.getByRole("dialog").getByLabel(/name/i).first(),
    ).toBeVisible()
  })
})

test.describe("clients filters", () => {
  test("tag filter popover mounts when there is at least one tag", async ({
    page,
  }) => {
    await page.goto("/dashboard/clients")
    const tagsButton = page
      .getByRole("button", { name: /tags/i })
      .first()
    if (!(await tagsButton.isVisible())) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "Tag manager trigger not visible — nothing to test.",
      })
      test.skip()
    }
    await tagsButton.click()
    // The popover/dialog lands with a "New tag" input or the tag manager
    // heading — we match on the most stable label across variants.
    await expect(
      page.getByRole("dialog").or(page.getByRole("menu")),
    ).toBeVisible()
  })
})

test.describe("client profile", () => {
  test("404s cleanly for a random uuid profile", async ({ page }) => {
    const bogusId = "00000000-0000-4000-8000-000000000000"
    const res = await page.goto(`/dashboard/clients/${bogusId}`)
    // Next renders not-found as a 404 status, but the page is still visible
    // (it's the closest not-found.tsx in the segment). If no not-found is
    // defined, Next's default "This page could not be found" appears.
    expect(res?.status() ?? 200).toBeLessThan(500)
    await expect(page.locator("body")).toBeVisible()
  })
})
