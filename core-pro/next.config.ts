import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

// Validate env vars at build start. @t3-oss/env-nextjs throws on missing
// / malformed values here, so misconfigured deploys fail fast instead of
// crashing in a random request handler.
import "./lib/env"

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    // Avatars, Stripe assets, Supabase Storage — wire real hosts in later
    // sessions. Kept empty by default for explicit opt-in.
    remotePatterns: [],
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry source map upload + tunnel route config.
  // Auth token, org, and project are read from env vars:
  //   SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT

  // Tunnel route bypasses ad blockers by proxying Sentry ingest
  // through the app's own domain.
  tunnelRoute: "/monitoring",

  // Source maps are uploaded then deleted from the build output
  // so they're never served to clients.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress Sentry build logs in CI unless debugging.
  silent: !process.env.CI,

  // Disable telemetry to Sentry about the plugin itself.
  telemetry: false,
})
