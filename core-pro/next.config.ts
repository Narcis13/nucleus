import type { NextConfig } from "next"
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

export default withNextIntl(nextConfig)
