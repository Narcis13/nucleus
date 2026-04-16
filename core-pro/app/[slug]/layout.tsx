import type { Metadata } from "next"

// Minimal layout for the public micro-site. Intentionally does NOT bring in
// Clerk, the dashboard chrome, or anything authenticated — micro-sites must
// render for anonymous visitors with zero extra network cost. The root layout
// already ships the fonts + PostHog providers, so this is just a passthrough.
export const metadata: Metadata = {
  // Per-slug metadata is produced by `generateMetadata` in page.tsx; we don't
  // want this layout to stamp its own title and override the dynamic one.
  title: undefined,
}

export default function MicroSiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-dvh">{children}</div>
}
