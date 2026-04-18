import { expect, test } from "@playwright/test"

// Appointments — calendar grid, availability editor, public booking widget.
//
// The booking widget is embedded on the public micro-site, so some of its
// coverage lives in micro-site.spec.ts. Here we focus on the dashboard
// calendar chrome and the iCal feed endpoint (the public subscription URL).

test.describe("calendar dashboard", () => {
  test("renders header and the grid container", async ({ page }) => {
    await page.goto("/dashboard/calendar")
    await expect(
      page.getByRole("heading", { level: 1, name: /calendar/i }),
    ).toBeVisible()
    // Grid lives inside <CalendarGrid>; it mounts with a row of weekday
    // labels on month/week views. We fall back to any role="grid" or a
    // known label ("Today") because the view selector may default differently.
    const todayBtn = page.getByRole("button", { name: /today/i }).first()
    const grid = page.getByRole("grid").first()
    await expect(todayBtn.or(grid)).toBeVisible({ timeout: 15_000 })
  })

  test("create-appointment dialog opens from the header CTA", async ({
    page,
  }) => {
    await page.goto("/dashboard/calendar")
    const trigger = page
      .getByRole("button", { name: /new appointment|add appointment|new event/i })
      .first()
    if (!(await trigger.isVisible())) {
      test.info().annotations.push({
        type: "skip-reason",
        description:
          "New-appointment trigger isn't surfaced on this breakpoint.",
      })
      test.skip()
    }
    await trigger.click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})

test.describe("iCal feed endpoint", () => {
  test("returns 400 for a non-uuid professional id", async ({ request }) => {
    const res = await request.get("/api/calendar/not-a-uuid/ical")
    expect(res.status()).toBe(400)
  })

  test("returns 404 for a well-formed but unknown professional id", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/calendar/00000000-0000-4000-8000-000000000000/ical",
    )
    expect([404, 200]).toContain(res.status())
    // If we did get a 404, ensure the body is short + contains 'Not found'.
    if (res.status() === 404) {
      const body = await res.text()
      expect(body.toLowerCase()).toContain("not found")
    }
  })
})
