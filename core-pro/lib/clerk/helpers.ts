import "server-only"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { professionals } from "@/lib/db/schema"
import type { Professional, UserRole } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// Clerk helpers — server-only.
//
// These are the "bridge" between Clerk identity and our Supabase/Drizzle rows.
// Webhook handlers and Server Actions use them to resolve the current user to
// a professional row, to sync profile changes idempotently, and to invite
// clients via Clerk organization invitations.
// ─────────────────────────────────────────────────────────────────────────────

// Current Clerk user id if any. Thin wrapper so callers don't have to import
// `auth` from `@clerk/nextjs/server` directly for the common case.
export async function getCurrentClerkUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId ?? null
}

// Resolve the current Clerk user to our internal professional uuid. Returns
// null when signed out or when no matching row exists yet (e.g. the webhook
// hasn't landed). Uses dbAdmin because callers are often guards that need to
// decide *whether* to start an RLS transaction.
export async function getCurrentProfessionalId(): Promise<string | null> {
  const userId = await getCurrentClerkUserId()
  if (!userId) return null
  const rows = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkUserId, userId))
    .limit(1)
  return rows[0]?.id ?? null
}

// The caller's role in the app: professional (org owner/admin), client (org
// member), admin (Clerk user with public_metadata.role === "admin"), or null
// when signed out.
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { userId, orgId, orgRole, sessionClaims } = await auth()
  if (!userId) return null

  const publicRole = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role
  if (publicRole === "admin") return "admin"

  if (orgId && orgRole) {
    // Clerk org roles are prefixed (e.g. "org:admin", "org:member"). Owners
    // and admins of a professional's org are the professional themselves;
    // plain members are invited clients.
    if (orgRole === "org:admin" || orgRole === "admin") return "professional"
    return "client"
  }

  // No org context — default to professional for a freshly signed-up user
  // whose personal workspace hasn't been linked to an org yet.
  return "professional"
}

// ─────────────────────────────────────────────────────────────────────────────
// syncUserToSupabase
//
// Idempotent upsert of a professional row from a Clerk user payload. Called
// from `user.created` and `user.updated` webhooks. Uses the service-role
// client (RLS bypass) because webhooks run outside any user session.
//
// Accepts the shape Clerk's webhook emits (`data: UserJSON`) directly.
// ─────────────────────────────────────────────────────────────────────────────
type ClerkUserPayload = {
  id: string
  email_addresses?: Array<{ id: string; email_address: string }>
  primary_email_address_id?: string | null
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
  phone_numbers?: Array<{ id: string; phone_number: string }>
  primary_phone_number_id?: string | null
}

export async function syncUserToSupabase(
  user: ClerkUserPayload,
): Promise<Professional | null> {
  const email = resolvePrimaryEmail(user)
  if (!email) {
    // No email means we can't satisfy the NOT NULL constraint on
    // `professionals.email`. Clerk *should* always provide one for a
    // completed signup, so treat this as a no-op rather than throwing —
    // webhooks retry, and the next event will have the email.
    return null
  }

  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || email

  const phone = resolvePrimaryPhone(user)
  const avatarUrl = user.image_url ?? null

  const rows = await dbAdmin
    .insert(professionals)
    .values({
      clerkUserId: user.id,
      email,
      fullName,
      phone: phone ?? null,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: professionals.clerkUserId,
      set: {
        email,
        fullName,
        phone: phone ?? null,
        avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning()

  return rows[0] ?? null
}

// Service-role deletion used by the `user.deleted` webhook for GDPR compliance.
// FK cascades handle dependent rows (clients, appointments, etc).
export async function deleteProfessionalByClerkId(
  clerkUserId: string,
): Promise<void> {
  await dbAdmin
    .delete(professionals)
    .where(eq(professionals.clerkUserId, clerkUserId))
}

// Link an existing professional row to a Clerk organization. Fired from the
// `organization.created` webhook once the professional creates their org.
export async function linkProfessionalToOrg(
  clerkUserId: string,
  clerkOrgId: string,
): Promise<void> {
  await dbAdmin
    .update(professionals)
    .set({ clerkOrgId, updatedAt: new Date() })
    .where(eq(professionals.clerkUserId, clerkUserId))
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
function resolvePrimaryEmail(user: ClerkUserPayload): string | null {
  const list = user.email_addresses ?? []
  if (list.length === 0) return null
  const primary = user.primary_email_address_id
    ? list.find((e) => e.id === user.primary_email_address_id)
    : undefined
  return (primary ?? list[0]).email_address ?? null
}

function resolvePrimaryPhone(user: ClerkUserPayload): string | null {
  const list = user.phone_numbers ?? []
  if (list.length === 0) return null
  const primary = user.primary_phone_number_id
    ? list.find((p) => p.id === user.primary_phone_number_id)
    : undefined
  return (primary ?? list[0]).phone_number ?? null
}
