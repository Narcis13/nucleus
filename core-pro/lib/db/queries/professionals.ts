import "server-only"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { microSites, professionals } from "@/lib/db/schema"
import type { Professional } from "@/types/domain"

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
