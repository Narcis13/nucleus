import { Suspense } from "react"

import { AcceptInviteClient } from "./accept-invite-client"

// ─────────────────────────────────────────────────────────────────────────────
// Magic-link landing page (Phase 0.5).
//
// Clerk appends `__clerk_ticket` and `__clerk_status` to the redirect URL on
// the OrganizationInvitation. We let the client component drive the ticket
// flow because it needs Clerk's browser hooks (`useSignIn` / `useSignUp`) to
// activate the session — there's no server-action equivalent.
//
// Three branches:
//   • status === "complete" → already signed in, send to /portal.
//   • status === "sign_in"  → existing user; activate the ticket and redirect.
//   • status === "sign_up"  → first-time user; show one-button confirm.
// ─────────────────────────────────────────────────────────────────────────────
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <AcceptInviteClient />
    </Suspense>
  )
}
