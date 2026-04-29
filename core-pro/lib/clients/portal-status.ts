import type { Client } from "@/types/domain"

export type PortalAccessStatus =
  | "not_invited"
  | "invited"
  | "active"
  | "revoked"

// Derive the portal-access status from the columns on the client row. Pure
// function so it can be reused on both server and client surfaces (the agent
// table renders client-side, the email picks the same labels server-side).
export function getPortalAccessStatus(client: Client): PortalAccessStatus {
  if (client.clerkUserId && !client.portalInviteRevokedAt) return "active"
  if (client.portalInviteId) return "invited"
  if (client.portalInviteRevokedAt) return "revoked"
  return "not_invited"
}

export const PORTAL_STATUS_LABEL: Record<PortalAccessStatus, string> = {
  not_invited: "Not invited",
  invited: "Invited",
  active: "Active",
  revoked: "Revoked",
}

// Tailwind-compatible badge colors for each status. Kept colocated so the
// table cell + the client profile chip stay in sync.
export const PORTAL_STATUS_BADGE: Record<
  PortalAccessStatus,
  { className: string }
> = {
  not_invited: { className: "border-muted-foreground/30 text-muted-foreground" },
  invited: { className: "border-amber-500/40 text-amber-700 dark:text-amber-400" },
  active: { className: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" },
  revoked: { className: "border-rose-500/40 text-rose-700 dark:text-rose-400" },
}
