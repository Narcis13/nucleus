import { expect, test } from "@playwright/test"

// Messages — inbox shell, empty-state fallback, composer placeholder.
//
// Real-time message delivery is covered by the Supabase Realtime hook
// (lib/hooks/use-realtime.ts) and its own unit tests. The E2E surface here
// just validates that the inbox renders and the composer/conversation list
// mount under the expected breakpoints.

test.describe("messages inbox", () => {
  test("empty state shows when there are no conversations", async ({
    page,
  }) => {
    await page.goto("/dashboard/messages")
    await expect(
      page.getByRole("heading", { level: 1, name: /messages/i }),
    ).toBeVisible()

    // We accept either the empty state or a populated conversation list.
    // The EmptyState copy is "No conversations yet" — the active thread
    // shell (if there's data) shows a composer placeholder instead.
    const empty = page.getByText(/no conversations yet/i)
    const threadOrList = page
      .locator('[data-testid="conversation-list"], [data-testid="message-thread"], textarea')
      .first()
    await expect(empty.or(threadOrList)).toBeVisible({ timeout: 15_000 })
  })

  test("no runtime exceptions from realtime channel setup", async ({
    page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/dashboard/messages")
    // Give the Supabase Realtime subscription a second to tear itself up —
    // a stale channel collision would throw on mount in React 19 strict mode.
    await page.waitForTimeout(1_000)
    expect(errors).toEqual([])
  })
})
