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

// `withSentryConfig` turns on the `clientTraceMetadata` Next experiment, which
// has RSC debug-stack bugs in Next 16.2.x + Turbopack (buildFakeCallStack /
// initializeDebugInfo crashes on `router.refresh()` after a server action).
// Keep Sentry out of the `next dev` path and apply it only for production
// builds, where we want source maps + tunneling anyway.
const withIntl = withNextIntl(nextConfig)

export default process.env.NODE_ENV === "production"
  ? withSentryConfig(withIntl, {
      // Tunnel route bypasses ad blockers by proxying Sentry ingest
      // through the app's own domain. Auth token, org, and project come
      // from SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT.
      tunnelRoute: "/monitoring",
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      silent: !process.env.CI,
      telemetry: false,
    })
  : withIntl
