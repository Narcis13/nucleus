import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import createNextIntlPlugin from "next-intl/plugin"

// Validate env vars at build start. @t3-oss/env-nextjs throws on missing
// / malformed values here, so misconfigured deploys fail fast instead of
// crashing in a random request handler.
import "./lib/env"

// Points next-intl at our request-config module; it uses the resolved
// locale to pick the right messages bundle on every render.
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts")

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
}

export default withSentryConfig(withNextIntl(nextConfig), {
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
