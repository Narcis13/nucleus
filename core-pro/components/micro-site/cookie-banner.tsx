"use client"

import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

// ─────────────────────────────────────────────────────────────────────────────
// <CookieBanner>
//
// Renders on public surfaces (micro-site, marketing) while the visitor has no
// stored decision. Uses `useSyncExternalStore` so the banner's "should I
// render?" question reads localStorage synchronously on the client (no flash
// on revisits that already have consent) and defaults to hidden on the
// server. A CustomEvent fires on decision so a lazy-loaded analytics bootstrap
// can pick it up without polling.
//
// `privacyPolicyUrl` links to the professional's own policy — the micro-site
// reads it from the GDPR settings and passes it in.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nucleus:cookie-consent"
type Consent = "accepted" | "rejected"

const consentStore = {
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => {}
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback()
    }
    window.addEventListener("storage", handler)
    window.addEventListener("cookieconsent", callback as EventListener)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener("cookieconsent", callback as EventListener)
    }
  },
  getSnapshot(): Consent | null {
    if (typeof window === "undefined") return null
    try {
      return (window.localStorage.getItem(STORAGE_KEY) as Consent | null) ?? null
    } catch {
      return null
    }
  },
  getServerSnapshot(): Consent | null {
    return null
  },
}

export function CookieBanner({
  privacyPolicyUrl,
}: {
  privacyPolicyUrl?: string | null
}) {
  const decision = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.getSnapshot,
    consentStore.getServerSnapshot,
  )

  // Hide on the server and whenever the user has already chosen.
  if (decision !== null) return null

  function persist(next: Consent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode — let it slide, the banner will return next visit */
    }
    // Surface the decision to consumers (e.g. a lazily-loaded analytics
    // bootstrap) via a CustomEvent. Analytics never fires without this.
    window.dispatchEvent(
      new CustomEvent("cookieconsent", { detail: next }),
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          We use cookies to keep the site secure and, if you accept, to
          understand how it&apos;s used.{" "}
          {privacyPolicyUrl ? (
            <a
              href={privacyPolicyUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Privacy policy
            </a>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => persist("rejected")}
          >
            Reject
          </Button>
          <Button size="sm" onClick={() => persist("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
