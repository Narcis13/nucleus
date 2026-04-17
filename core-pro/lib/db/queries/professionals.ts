import "server-only"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { withRLS } from "@/lib/db/rls"
import {
  microSites,
  professionalSettings,
  professionals,
} from "@/lib/db/schema"
import type { GdprSettings, Professional } from "@/types/domain"

// Single row scoped to the current Clerk user. RLS on `professionals` already
// limits us to our own row, but we filter explicitly so the planner uses the
// `clerk_user_id` index.
export async function getProfessional(): Promise<Professional | null> {
  const { userId } = await auth()
  if (!userId) return null
  return withRLS(async (tx) => {
    const rows = await tx
      .select()
      .from(professionals)
      .where(eq(professionals.clerkUserId, userId))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function updateProfessional(
  patch: Partial<
    Omit<Professional, "id" | "clerkUserId" | "createdAt" | "updatedAt">
  >,
): Promise<Professional | null> {
  const { userId } = await auth()
  if (!userId) return null
  return withRLS(async (tx) => {
    const rows = await tx
      .update(professionals)
      .set(patch)
      .where(eq(professionals.clerkUserId, userId))
      .returning()
    return rows[0] ?? null
  })
}

// Resolves the professional whose workspace the currently-signed-in *client*
// belongs to. Clients are invited as Clerk org members, so the active orgId
// on the session is the professional's workspace.
//
// Uses `dbAdmin` because the RLS policies on `professionals` only permit the
// professional themselves to SELECT their own row — a client in the same org
// can't see it otherwise. We return a narrow branding-shaped projection so no
// sensitive columns (stripe ids, billing, etc.) leak through this path even
// if callers grow careless with it.
export async function getProfessionalForClientPortal(): Promise<{
  id: string
  fullName: string
  avatarUrl: string | null
  branding: Professional["branding"]
} | null> {
  const { orgId } = await auth()
  if (!orgId) return null
  const rows = await dbAdmin
    .select({
      id: professionals.id,
      fullName: professionals.fullName,
      avatarUrl: professionals.avatarUrl,
      branding: professionals.branding,
    })
    .from(professionals)
    .where(eq(professionals.clerkOrgId, orgId))
    .limit(1)
  return rows[0] ?? null
}

// Cheap projection of the professional's privacy-policy URL — cookie banner
// on the public micro-site fetches it to link "Privacy policy" to the
// professional's own document when they've configured one. Service-role
// because we may be rendering for an anonymous visitor.
export async function getProfessionalPrivacyPolicyUrl(
  professionalId: string,
): Promise<string | null> {
  const rows = await dbAdmin
    .select({ gdprSettings: professionalSettings.gdprSettings })
    .from(professionalSettings)
    .where(eq(professionalSettings.professionalId, professionalId))
    .limit(1)
  const settings = rows[0]?.gdprSettings as GdprSettings | null
  return settings?.privacy_policy_url ?? null
}

// Public lookup used by the micro-site routes ([slug]/...). Goes through
// `withRLS` so the `micro_sites_public_select` policy (anon + authenticated)
// applies; the result is whichever professional owns a *published* site.
export async function getProfessionalBySlug(
  slug: string,
): Promise<Professional | null> {
  return withRLS(async (tx) => {
    const rows = await tx
      .select({ professional: professionals })
      .from(microSites)
      .innerJoin(
        professionals,
        eq(professionals.id, microSites.professionalId),
      )
      .where(eq(microSites.slug, slug))
      .limit(1)
    return rows[0]?.professional ?? null
  })
}
