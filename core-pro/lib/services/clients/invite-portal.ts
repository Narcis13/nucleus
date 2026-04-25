import "server-only"

import { eq } from "drizzle-orm"

import { createPortalMagicLink } from "@/lib/clerk/helpers"
import { clients } from "@/lib/db/schema"
import { getProfessional } from "@/lib/db/queries/professionals"
import { env } from "@/lib/env"
import { trackServerEvent } from "@/lib/posthog/events"
import { sendEmail } from "@/lib/resend/client"
import { getPlan } from "@/lib/stripe/plans"
import type { Branding } from "@/types/domain"

import type { ServiceContext } from "../_lib/context"
import { NotFoundError, ServiceError, UnauthorizedError } from "../_lib/errors"

export type InviteClientToPortalInput = { clientId: string }
export type InviteClientToPortalResult = {
  url: string
  invitationId: string
  email: string
}

// Generates a fresh magic-link invite for a client and persists the URL on
// the client row so the agent can copy/forward it from the UI without
// re-hitting Clerk. Idempotency is the caller's job — `resendClientPortalInvite`
// wraps a revoke-then-create cycle for that case.
export async function inviteClientToPortal(
  ctx: ServiceContext,
  input: InviteClientToPortalInput,
): Promise<InviteClientToPortalResult> {
  const professional = await getProfessional()
  if (!professional) {
    throw new UnauthorizedError("Complete onboarding before inviting clients.")
  }
  if (!professional.clerkOrgId) {
    throw new ServiceError(
      "Finish workspace setup before sending portal invites.",
    )
  }

  const [client] = await ctx.db
    .select()
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1)
  if (!client) {
    throw new NotFoundError("Client not found.")
  }

  const redirectUrl = new URL("/accept-invite", env.NEXT_PUBLIC_APP_URL).toString()
  const { invitationId, url } = await createPortalMagicLink({
    email: client.email,
    professionalId: professional.id,
    clerkOrgId: professional.clerkOrgId,
    inviterUserId: professional.clerkUserId,
    redirectUrl,
  })

  const now = new Date()
  await ctx.db
    .update(clients)
    .set({
      portalInviteId: invitationId,
      portalInviteUrl: url,
      portalInviteSentAt: now,
      portalInviteRevokedAt: null,
      updatedAt: now,
    })
    .where(eq(clients.id, client.id))

  // Best-effort: deliver the magic link via email so the agent has a fallback
  // even when they haven't copied the URL into another channel yet. Errors
  // are swallowed because the URL is also returned to the action layer for
  // copy/paste.
  void sendEmail({
    to: client.email,
    template: "client-invitation",
    tenantId: professional.id,
    plan: getPlan(professional.plan).id,
    data: {
      professionalName: professional.fullName,
      branding: (professional.branding ?? null) as Branding | null,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      locale: client.locale ?? professional.locale ?? "ro",
      recipientName: client.fullName,
      inviteUrl: url,
      expiresInDays: 7,
    },
  }).catch(() => {})

  void trackServerEvent("client_portal_invited", {
    distinctId: professional.clerkUserId,
    professionalId: professional.id,
    clientId: client.id,
  })

  return { url, invitationId, email: client.email }
}
