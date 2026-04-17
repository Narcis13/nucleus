import { defineConfig, devices } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Playwright configuration — Session 25 E2E harness.
//
// The dev server is started by Playwright itself so CI runs don't need a
// pre-booted app. We serialize auth setup through a single storage-state file
// so each test starts already-signed-in as the professional or client fixture.
// ─────────────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/.output",
  fullyParallel: false, // Seed data is shared state — keep runs serial by default.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-testid",
  },

  projects: [
    {
      name: "setup",
      testDir: "./tests/fixtures",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./tests/.auth/professional.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "./tests/.auth/professional.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: process.env.E2E_SKIP_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
})
