import type { Metadata } from "next"
import Link from "next/link"
import { WifiOff } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Offline — CorePro",
  description: "You are offline. Some cached content is still available.",
  robots: { index: false, follow: false },
}

// Precached by the service worker on install. Rendered statically so it can
// be served from the static cache when the user has no connectivity —
// navigating here must never hit runtime APIs or auth.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center text-foreground">
      <WifiOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="font-heading text-2xl font-semibold">You are offline</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        We couldn&apos;t reach the CorePro servers. Cached pages like your
        recent appointments and messages are still available from the menu.
        Anything you send will sync automatically when you reconnect.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
        >
          Go to dashboard
        </Link>
        <Link
          href="/portal"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          Go to client portal
        </Link>
      </div>
    </main>
  )
}
