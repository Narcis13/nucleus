import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  deleteProfessionalByClerkId,
  linkProfessionalToOrg,
  syncUserToSupabase,
} from "@/lib/clerk/helpers"
import { dbAdmin } from "@/lib/db/client"
import {
  clients,
  professionalClients,
  professionals,
} from "@/lib/db/schema"
import { trackServerEvent } from "@/lib/posthog/events"
import { identifyServer } from "@/lib/posthog/server"
import { captureException } from "@/lib/sentry"

// ─────────────────────────────────────────────────────────────────────────────
// Clerk webhook endpoint — keeps Supabase state in sync with Clerk identity.
//
// Signature verification runs first via `verifyWebhook` (Standard Webhooks /
// Svix under the hood, secret from CLERK_WEBHOOK_SIGNING_SECRET). Unsigned or
// malformed requests return 400.
//
// Events handled:
//   user.created, user.updated          → upsert professionals row
//   user.deleted                        → delete professionals row (cascades)
//   organization.created                → link org id to professional
//   organizationMembership.created      → create client + link to professional
//   organizationMembership.deleted      → soft-detach client link
//
// Every handler is idempotent because Clerk retries on 5xx and occasionally
// on network errors.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    captureException(err, { tags: { webhook: "clerk", stage: "verify" } })
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    )
  }

  try {
    switch (evt.type) {
      case "user.created": {
        const row = await syncUserToSupabase(evt.data)
        if (row) {
          void identifyServer({
            distinctId: row.clerkUserId,
            properties: { plan: row.plan ?? "starter", role: "professional" },
          })
          void trackServerEvent("professional_signed_up", {
            distinctId: row.clerkUserId,
            professionalId: row.id,
            plan: row.plan,
          })
        }
        break
      }

      case "user.updated": {
        await syncUserToSupabase(evt.data)
        break
      }

      case "user.deleted": {
        if (evt.data.id) {
          await deleteProfessionalByClerkId(evt.data.id)
        }
        break
      }

      case "organization.created": {
        // Clerk includes `created_by` on the org payload — the user who
        // created the org is (by convention) the professional who owns it.
        const createdBy = evt.data.created_by
        if (createdBy) {
          await linkProfessionalToOrg(createdBy, evt.data.id)
        }
        break
      }

      case "organizationMembership.created": {
        await handleMembershipCreated(evt.data)
        break
      }

      case "organizationMembership.deleted": {
        await handleMembershipDeleted(evt.data)
        break
      }

      default:
        // Unhandled events are fine — Clerk will stop sending them once we
        // narrow the subscription list in the dashboard.
        break
    }
  } catch (err) {
    captureException(err, {
      tags: { webhook: "clerk", eventType: evt.type },
    })
    // Return 500 so Clerk retries. Svix will back off exponentially.
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// Membership handlers
//
// Organization membership events drive the client lifecycle. When a
// professional invites a client and the client accepts, Clerk fires
// `organizationMembership.created` with:
//   - data.organization.id   → maps to professionals.clerk_org_id
//   - data.public_user_data  → the client's Clerk identity
//   - data.role              → org role (org:member = client)
//
// We create a `clients` row (if needed) and link it to the professional via
// `professional_clients`. Org admins/owners are skipped — they are the
// professional themselves.
// ─────────────────────────────────────────────────────────────────────────────
type MembershipData = {
  organization: { id: string }
  public_user_data: {
    user_id: string
    identifier: string
    first_name: string | null
    last_name: string | null
    image_url: string
  }
  role: string
}

async function handleMembershipCreated(data: MembershipData): Promise<void> {
  // The professional themselves is the org admin — we already have their row.
  if (data.role === "org:admin" || data.role === "admin") return

  const orgId = data.organization.id
  const user = data.public_user_data

  const proRows = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkOrgId, orgId))
    .limit(1)
  const professionalId = proRows[0]?.id
  if (!professionalId) {
    // Professional's org row hasn't been synced yet. Webhook retry will pick
    // it up once `organization.created` has been processed.
    throw new Error(`No professional linked to org ${orgId}`)
  }

  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || user.identifier

  const clientRows = await dbAdmin
    .insert(clients)
    .values({
      clerkUserId: user.user_id,
      email: user.identifier,
      fullName,
      avatarUrl: user.image_url || null,
    })
    .onConflictDoUpdate({
      target: clients.clerkUserId,
      set: {
        email: user.identifier,
        fullName,
        avatarUrl: user.image_url || null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: clients.id })
  const clientId = clientRows[0]?.id
  if (!clientId) throw new Error("Client upsert returned no row")

  await dbAdmin
    .insert(professionalClients)
    .values({
      professionalId,
      clientId,
      status: "active",
      role: "client",
      source: "clerk_invitation",
    })
    .onConflictDoNothing({
      target: [
        professionalClients.professionalId,
        professionalClients.clientId,
      ],
    })
}

async function handleMembershipDeleted(data: MembershipData): Promise<void> {
  const orgId = data.organization.id
  const clerkUserId = data.public_user_data.user_id

  const proRows = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkOrgId, orgId))
    .limit(1)
  const professionalId = proRows[0]?.id
  if (!professionalId) return

  const clientRows = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, clerkUserId))
    .limit(1)
  const clientId = clientRows[0]?.id
  if (!clientId) return

  await dbAdmin
    .update(professionalClients)
    .set({ status: "inactive", endDate: new Date().toISOString().slice(0, 10) })
    .where(
      and(
        eq(professionalClients.professionalId, professionalId),
        eq(professionalClients.clientId, clientId),
      ),
    )
}
