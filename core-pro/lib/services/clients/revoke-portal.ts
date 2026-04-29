import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import {
  clients,
  portalInvites,
  portalSessions,
} from "@/lib/db/schema"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, UnauthorizedError } from "../_lib/errors"

export type RevokeClientPortalAccessInput = { clientId: string }
export type RevokeClientPortalAccessResult = { revoked: true }

// Cuts off both pending invites and active sessions for a client. Pending
// magic-link rows are marked used (so the link can't be redeemed); active
// `portal_sessions` rows are revoked so the next request from any browser
// using one redirects to /portal/sign-in via `requirePortalSession`.
//
// `clients.portal_invite_revoked_at` is still written so the agent UI's
// status badge flips to "revoked" — the column stays around as a UI hint
// even though the DB-backed `portal_invites` / `portal_sessions` rows are
// the source of truth now.
export async function revokeClientPortalAccess(
  _ctx: ServiceContext,
  input: RevokeClientPortalAccessInput,
): Promise<RevokeClientPortalAccessResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError(
      "Complete onboarding before managing portal access.",
    )
  }

  const [client] = await dbAdmin
    .select()
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1)
  if (!client) {
    throw new NotFoundError("Client not found.")
  }

  const now = new Date()

  // Burn any unredeemed magic links — `requirePortalSession` rejects on
  // `used_at IS NOT NULL`, so this stops a freshly-emailed link from working
  // even if delivery is mid-flight.
  await dbAdmin
    .update(portalInvites)
    .set({ usedAt: now })
    .where(
      and(eq(portalInvites.clientId, client.id), isNull(portalInvites.usedAt)),
    )

  // Revoke every live session — sliding-window touch in `readSession` fails
  // because the row's `revoked_at` filter trips, so the cookie value is
  // immediately worthless.
  await dbAdmin
    .update(portalSessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(portalSessions.clientId, client.id),
        isNull(portalSessions.revokedAt),
      ),
    )

  await dbAdmin
    .update(clients)
    .set({
      portalInviteId: null,
      portalInviteUrl: null,
      portalInviteRevokedAt: now,
      updatedAt: now,
    })
    .where(eq(clients.id, client.id))

  void trackServerEvent("client_portal_revoked", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    clientId: client.id,
  })

  return { revoked: true }
}
