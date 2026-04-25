import "server-only"

import { eq } from "drizzle-orm"

import {
  revokePortalActiveAccess,
  revokePortalInvitation,
} from "@/lib/clerk/helpers"
import { clients } from "@/lib/db/schema"
import { getProfessional } from "@/lib/db/queries/professionals"
import { trackServerEvent } from "@/lib/posthog/events"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError, UnauthorizedError } from "../_lib/errors"

export type RevokeClientPortalAccessInput = { clientId: string }
export type RevokeClientPortalAccessResult = { revoked: true }

// Revokes whichever combination of pending invite + active access the client
// currently has. Always sets `portal_invite_revoked_at` so the UI can surface
// "revoked" status; clears `portal_invite_id` / `portal_invite_url` so the
// agent doesn't accidentally forward a stale magic link.
export async function revokeClientPortalAccess(
  ctx: ServiceContext,
  input: RevokeClientPortalAccessInput,
): Promise<RevokeClientPortalAccessResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError(
      "Complete onboarding before managing portal access.",
    )
  }
  if (!professional.clerkOrgId) {
    throw new ServiceError("Workspace not linked to Clerk yet.")
  }

  const [client] = await ctx.db
    .select()
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1)
  if (!client) {
    throw new NotFoundError("Client not found.")
  }

  if (client.portalInviteId) {
    await revokePortalInvitation({
      invitationId: client.portalInviteId,
      clerkOrgId: professional.clerkOrgId,
      requestingUserId: professional.clerkUserId,
    })
  }

  if (client.clerkUserId) {
    await revokePortalActiveAccess({
      clerkUserId: client.clerkUserId,
      clerkOrgId: professional.clerkOrgId,
    })
  }

  const now = new Date()
  await ctx.db
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
