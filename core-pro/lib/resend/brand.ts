import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { professionalClients, professionals } from "@/lib/db/schema"
import { env } from "@/lib/env"
import type { Branding } from "@/types/domain"

export type ResolvedBrand = {
  professionalName: string
  branding: Branding | null
  appUrl: string
  unsubscribeUrl: string
  locale: string | null
}

// Resolves the brand context (display name + branding jsonb + app URLs +
// locale) for a professional. Used everywhere we render an email so live sends
// match what the preview route shows. Bypasses RLS via dbAdmin because senders
// often run without a Clerk session (Trigger.dev tasks, public actions).
export async function resolveProfessionalBrand(
  professionalId: string,
): Promise<ResolvedBrand | null> {
  const rows = await dbAdmin
    .select({
      fullName: professionals.fullName,
      branding: professionals.branding,
      locale: professionals.locale,
    })
    .from(professionals)
    .where(eq(professionals.id, professionalId))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return {
    professionalName: row.fullName,
    branding: (row.branding ?? null) as Branding | null,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    unsubscribeUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/settings/notifications`,
    locale: row.locale ?? null,
  }
}

// Notification recipients can be a professional (their own brand) or a client
// (their owning professional's brand). Resolves both shapes to the same brand
// payload so the generic notification email renders consistently.
export async function resolveBrandForRecipient(args: {
  userId: string
  userType: "professional" | "client"
}): Promise<ResolvedBrand | null> {
  if (args.userType === "professional") {
    return resolveProfessionalBrand(args.userId)
  }
  const rows = await dbAdmin
    .select({ professionalId: professionalClients.professionalId })
    .from(professionalClients)
    .where(
      and(
        eq(professionalClients.clientId, args.userId),
        eq(professionalClients.status, "active"),
      ),
    )
    .orderBy(desc(professionalClients.createdAt))
    .limit(1)
  const owner = rows[0]?.professionalId
  if (!owner) return null
  return resolveProfessionalBrand(owner)
}
