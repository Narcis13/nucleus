import { PortalSignInClient } from "./portal-sign-in-client"

// ─────────────────────────────────────────────────────────────────────────────
// Lost-link recovery (Phase 0.5).
//
// Reachable when the client lost their original magic link or is on a new
// device. Clerk emails them a fresh email-link; on success they land on
// /portal. We bypass the dashboard's own /sign-in flow because portal users
// don't have password credentials.
// ─────────────────────────────────────────────────────────────────────────────
export default function PortalSignInPage() {
  return <PortalSignInClient />
}
