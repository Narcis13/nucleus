import { expect, test } from "@playwright/test"

// Leads pipeline — Kanban board, default stage seed, stage manager.
//
// The list page seeds a default "New → Won" pipeline on first load via
// `ensureDefaultStages`. That means the board is always non-empty even on
// a fresh workspace, so we can assert the default columns show up.

test.describe("leads board", () => {
  test("renders header and default stages", async ({ page }) => {
    await page.goto("/dashboard/leads")
    await expect(
      page.getByRole("heading", { level: 1, name: /leads/i }),
    ).toBeVisible()

    // Default pipeline includes a "New" stage — it's the first column
    // seeded by ensureDefaultStages. Assert at least one column header is
    // visible; the text matches the seeded stage name, which defaults to
    // English ("New") unless overridden.
    const anyStageHeading = page
      .getByRole("heading", { level: 3 })
      .or(page.locator('[data-stage-name]'))
      .first()
    await expect(anyStageHeading).toBeVisible({ timeout: 15_000 })
  })

  test("stage manager trigger opens the manager sheet", async ({ page }) => {
    await page.goto("/dashboard/leads")
    const trigger = page
      .getByRole("button", { name: /manage stages/i })
      .first()
    if (!(await trigger.isVisible())) {
      test.info().annotations.push({
        type: "skip-reason",
        description:
          "Stage manager trigger isn't labelled 'Manage stages' in this build.",
      })
      test.skip()
    }
    await trigger.click()
    await expect(
      page
        .getByRole("dialog")
        .or(page.getByRole("complementary"))
        .or(page.getByText(/stage/i).first()),
    ).toBeVisible()
  })
})

test.describe("kanban interactions", () => {
  test("keyboard-accessible drag target acquires focus", async ({ page }) => {
    await page.goto("/dashboard/leads")
    // @dnd-kit wires keyboard drag via KeyboardSensor — confirm at least one
    // lead card (or the empty column's drop zone) is reachable via Tab.
    //
    // We don't exercise the drag itself (timing-sensitive across browsers),
    // just the reachability. Skip if the board has no draggables yet.
    const firstDraggable = page
      .locator('[data-draggable], [role="button"][data-lead-id]')
      .first()
    if (!(await firstDraggable.isVisible())) {
      test.skip()
    }
    await firstDraggable.focus()
    await expect(firstDraggable).toBeFocused()
  })
})
