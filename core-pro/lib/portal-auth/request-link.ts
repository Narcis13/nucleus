import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import {
  clients,
  professionalClients,
  professionals,
} from "@/lib/db/schema"
import { env } from "@/lib/env"
import { issuePortalMagicLink } from "@/lib/portal-auth/issue"
import { sendEmail } from "@/lib/resend/client"
import { getPlan } from "@/lib/stripe/plans"
import type { Branding } from "@/types/domain"

export type RequestPortalMagicLinkInput = { email: string }

// ─────────────────────────────────────────────────────────────────────────────
// requestPortalMagicLinkByEmail
//
// Self-service "lost link" path: a client enters their email on
// `/portal/sign-in`, and if we recognise the address we mail them a fresh
// magic link. The caller never learns whether the email matched — this is
// a deliberate constraint to prevent enumeration. The function always
// resolves successfully; the only signal is the inbox.
//
// We pick the most recent active `professional_clients` row for that email.
// In practice clients only belong to one professional, but the join is left
// permissive so an edge-case multi-tenant client still gets a working link to
// their primary workspace.
// ─────────────────────────────────────────────────────────────────────────────
export async function requestPortalMagicLinkByEmail(
  input: RequestPortalMagicLinkInput,
): Promise<void> {
  const email = input.email.trim().toLowerCase()
  if (!email) return

  const rows = await dbAdmin
    .select({
      clientId: clients.id,
      clientFullName: clients.fullName,
      clientLocale: clients.locale,
      professionalId: professionals.id,
      professionalFullName: professionals.fullName,
      professionalLocale: professionals.locale,
      professionalBranding: professionals.branding,
      professionalPlan: professionals.plan,
    })
    .from(clients)
    .innerJoin(
      professionalClients,
      and(
        eq(professionalClients.clientId, clients.id),
        eq(professionalClients.status, "active"),
      ),
    )
    .innerJoin(
      professionals,
      eq(professionals.id, professionalClients.professionalId),
    )
    .where(eq(clients.email, email))
    .orderBy(desc(professionalClients.createdAt))
    .limit(1)

  const match = rows[0]
  if (!match) return

  const { url } = await issuePortalMagicLink({
    clientId: match.clientId,
    professionalId: match.professionalId,
  })

  await sendEmail({
    to: email,
    template: "client-invitation",
    tenantId: match.professionalId,
    plan: getPlan(match.professionalPlan).id,
    data: {
      professionalName: match.professionalFullName,
      branding: (match.professionalBranding ?? null) as Branding | null,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      locale: match.clientLocale ?? match.professionalLocale ?? "ro",
      recipientName: match.clientFullName,
      inviteUrl: url,
      expiresInDays: 7,
    },
  }).catch(() => {})
}
