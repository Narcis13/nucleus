import { PortalSignInClient } from "./portal-sign-in-client"

// ─────────────────────────────────────────────────────────────────────────────
// Portal sign-in (lost-link recovery).
//
// Reachable when the client lost their original magic link or is on a new
// device. Posts to `requestPortalLinkAction` which mints a fresh
// `portal_invites` row and emails it via Resend; the response is always
// "check your inbox" so attackers can't enumerate registered emails.
// ─────────────────────────────────────────────────────────────────────────────
export default function PortalSignInPage() {
  return <PortalSignInClient />
}
