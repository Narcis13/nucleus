import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"

import { dbAdmin } from "@/lib/db/client"
import {
  appointments,
  clientSettings,
  clientTags,
  clients,
  conversations,
  documents,
  formAssignments,
  formResponses,
  invoices,
  leadActivities,
  leads,
  messages,
  professionalClients,
  professionals,
  tags,
} from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gdpr/export/[client_id]
//
// Exports every row we hold about a client — the right-of-access ("Subject
// Access Request") side of GDPR Article 15. Two callers are allowed:
//
//   • The professional the client belongs to (ownership via
//     professional_clients), for admin-side exports from the GDPR settings
//     page.
//   • The client themselves, for portal-side "download my data" flows added
//     in a later session.
//
// Supports JSON (default) and CSV (?format=csv) — CSV is a flat per-table
// dump zipped by convention, but for simplicity we emit a single sheet-like
// text file with section headings since email clients usually mangle real
// ZIP attachments.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  req: Request,
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

  const access = await authorizeExport(userId, client_id)
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const data = await collectClientData(client_id)
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json"
  const filename = `gdpr-export-${data.client.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${client_id.slice(0, 8)}`

  if (format === "csv") {
    return new NextResponse(toCsv(data), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.json"`,
      "Cache-Control": "no-store",
    },
  })
}

// Verifies the caller is entitled to read this client's data. Uses dbAdmin
// because we need to check across the professionals + clients tables without
// running under either user's RLS context.
async function authorizeExport(
  clerkUserId: string,
  clientId: string,
): Promise<"professional" | "client" | null> {
  // Professional side: must own a professional_clients link to this client.
  const proRows = await dbAdmin
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.clerkUserId, clerkUserId))
    .limit(1)
  if (proRows[0]) {
    const link = await dbAdmin
      .select({ id: professionalClients.id })
      .from(professionalClients)
      .where(
        and(
          eq(professionalClients.professionalId, proRows[0].id),
          eq(professionalClients.clientId, clientId),
        ),
      )
      .limit(1)
    if (link[0]) return "professional"
  }

  // Client side: the clerk user must map to this exact client id.
  const selfRows = await dbAdmin
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clerkUserId, clerkUserId))
    .limit(1)
  if (selfRows[0]?.id === clientId) return "client"

  return null
}

async function collectClientData(clientId: string) {
  const [client] = await dbAdmin
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)
  if (!client) return null

  const [
    relationships,
    tagRows,
    settings,
    clientAppointments,
    clientDocuments,
    clientInvoices,
    clientConversations,
    formAssignmentRows,
    formResponseRows,
    leadRows,
  ] = await Promise.all([
    dbAdmin
      .select()
      .from(professionalClients)
      .where(eq(professionalClients.clientId, clientId)),
    dbAdmin
      .select({ tag: tags })
      .from(clientTags)
      .innerJoin(tags, eq(tags.id, clientTags.tagId))
      .where(eq(clientTags.clientId, clientId)),
    dbAdmin
      .select()
      .from(clientSettings)
      .where(eq(clientSettings.clientId, clientId))
      .limit(1),
    dbAdmin.select().from(appointments).where(eq(appointments.clientId, clientId)),
    dbAdmin.select().from(documents).where(eq(documents.clientId, clientId)),
    dbAdmin.select().from(invoices).where(eq(invoices.clientId, clientId)),
    dbAdmin
      .select()
      .from(conversations)
      .where(eq(conversations.clientId, clientId)),
    dbAdmin
      .select()
      .from(formAssignments)
      .where(eq(formAssignments.clientId, clientId)),
    dbAdmin
      .select()
      .from(formResponses)
      .where(eq(formResponses.clientId, clientId)),
    dbAdmin
      .select()
      .from(leads)
      .where(eq(leads.convertedClientId, clientId)),
  ])

  // Messages are linked to conversations (not directly to a client), so we
  // pull every message under this client's conversations.
  const conversationIds = clientConversations.map((c) => c.id)
  const clientMessages = conversationIds.length
    ? await dbAdmin
        .select()
        .from(messages)
        .where(
          inArray(messages.conversationId, conversationIds),
        )
    : []

  const leadIds = leadRows.map((l) => l.id)
  const leadActivityRows = leadIds.length
    ? await dbAdmin
        .select()
        .from(leadActivities)
        .where(inArray(leadActivities.leadId, leadIds))
    : []

  return {
    exportedAt: new Date().toISOString(),
    client,
    relationships,
    tags: tagRows.map((t) => t.tag),
    settings: settings[0] ?? null,
    appointments: clientAppointments,
    documents: clientDocuments,
    invoices: clientInvoices,
    messages: clientMessages,
    conversations: clientConversations,
    formAssignments: formAssignmentRows,
    formResponses: formResponseRows,
    leads: leadRows,
    leadActivities: leadActivityRows,
  }
}

type ExportPayload = Awaited<ReturnType<typeof collectClientData>>

// Emits a plaintext CSV-by-section dump. Not RFC 4180 perfect (we don't wrap
// every cell with quotes unless it needs one) but it opens cleanly in Excel
// and Numbers, which is what auditors actually ask for.
function toCsv(data: NonNullable<ExportPayload>): string {
  const lines: string[] = []
  lines.push(`# GDPR export — ${data.client.fullName}`)
  lines.push(`# exported_at: ${data.exportedAt}`)
  lines.push("")

  function section(name: string, rows: unknown[]) {
    lines.push(`## ${name}`)
    if (!Array.isArray(rows) || rows.length === 0) {
      lines.push("(no records)")
      lines.push("")
      return
    }
    const first = rows[0] as Record<string, unknown>
    const cols = Object.keys(first)
    lines.push(cols.join(","))
    for (const row of rows as Record<string, unknown>[]) {
      lines.push(cols.map((c) => csvCell(row[c])).join(","))
    }
    lines.push("")
  }

  section("Client", [data.client])
  section("Relationships", data.relationships)
  section("Tags", data.tags)
  section("Settings", data.settings ? [data.settings] : [])
  section("Appointments", data.appointments)
  section("Documents", data.documents)
  section("Invoices", data.invoices)
  section("Messages", data.messages)
  section("Conversations", data.conversations)
  section("Form assignments", data.formAssignments)
  section("Form responses", data.formResponses)
  section("Leads", data.leads)
  section("Lead activities", data.leadActivities)

  return lines.join("\n")
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s =
    typeof value === "string"
      ? value
      : value instanceof Date
        ? value.toISOString()
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
