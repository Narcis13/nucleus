import { auth, clerkClient } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { dbAdmin } from "@/lib/db/client"
import {
  clients,
  invoices,
  professionalClients,
  professionals,
} from "@/lib/db/schema"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gdpr/delete/[client_id]
//
// Right-to-be-forgotten ("erasure") — GDPR Article 17. Irreversibly removes:
//   • The `clients` row (cascades: client_settings, client_tags, messages
//     through conversations, appointments, documents, form_assignments/responses).
//   • Any invoices for the client (FK is `restrict`, so we null them out or
//     delete them before touching the client row — here we delete, since
//     GDPR requires full erasure).
//   • Any Supabase Storage objects under `<professional_id>/<client_id>/`.
//   • The client's Clerk user if they had accepted the invitation.
//
// The caller must be the owning professional. We deliberately don't let the
// client delete themselves via this route — portal-side self-deletion runs
// through a separate confirmation flow so it can notify the professional
// before cutting off their access.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ client_id: string }> },
) {
  const { client_id } = await params
  if (!UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 })
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Resolve the caller to a professional and verify ownership.
  const proRows = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkUserId, userId))
    .limit(1)
  const professional = proRows[0]
  if (!professional) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const link = await dbAdmin
    .select({ id: professionalClients.id })
    .from(professionalClients)
    .where(
      and(
        eq(professionalClients.professionalId, professional.id),
        eq(professionalClients.clientId, client_id),
      ),
    )
    .limit(1)
  if (!link[0]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [client] = await dbAdmin
    .select({ id: clients.id, clerkUserId: clients.clerkUserId })
    .from(clients)
    .where(eq(clients.id, client_id))
    .limit(1)
  if (!client) {
    return NextResponse.json({ ok: true, already: "absent" })
  }

  // 1) Invoices FK is `restrict` — delete them first.
  await dbAdmin.delete(invoices).where(eq(invoices.clientId, client_id))

  // 2) Storage cleanup — remove both documents/<pro>/<client>/* and
  //    media/<pro>/<client>/*. Storage errors don't block the DB delete;
  //    we report them for observability.
  const admin = getSupabaseAdmin()
  for (const bucket of ["documents", "media"] as const) {
    try {
      const { data: files } = await admin.storage
        .from(bucket)
        .list(`${professional.id}/${client_id}`, { limit: 1000 })
      const paths = (files ?? []).map(
        (f) => `${professional.id}/${client_id}/${f.name}`,
      )
      if (paths.length > 0) {
        await admin.storage.from(bucket).remove(paths)
      }
    } catch (err) {
      console.error(err, {
        tags: { route: "gdpr.delete", bucket },
        extra: { clientId: client_id, professionalId: professional.id },
      })
    }
  }

  // 3) Clients row delete — cascades through the FK graph.
  await dbAdmin.delete(clients).where(eq(clients.id, client_id))

  // 4) Clerk user cleanup — best-effort. If the client never accepted the
  //    invitation there's nothing to delete.
  if (client.clerkUserId) {
    try {
      const clerk = await clerkClient()
      await clerk.users.deleteUser(client.clerkUserId)
    } catch (err) {
      console.error(err, {
        tags: { route: "gdpr.delete", stage: "clerk" },
        extra: { clientId: client_id },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
