import type { NextConfig } from "next"

// Validate env vars at build start. @t3-oss/env-nextjs throws on missing
// / malformed values here, so misconfigured deploys fail fast instead of
// crashing in a random request handler.
import "./lib/env"

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    // Avatars, Stripe assets, Supabase Storage — wire real hosts in later
    // sessions. Kept empty by default for explicit opt-in.
    remotePatterns: [],
  },
}

export default nextConfig
