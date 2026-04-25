import "server-only"

import { getClientsByIds } from "@/lib/db/queries/clients"

import type { ServiceContext } from "../_lib/context"

export type ExportClientsInput = { clientIds?: string[] }
export type ExportClientsResult = { filename: string; csv: string }

export async function exportClients(
  _ctx: ServiceContext,
  input: ExportClientsInput,
): Promise<ExportClientsResult> {
  const clientIds = input.clientIds ?? []
  const rows = clientIds.length > 0 ? await getClientsByIds(clientIds) : []
  const csv = toCsv(rows)
  return { filename: "clients.csv", csv }
}

function toCsv(
  rows: Array<{
    client: { fullName: string; email: string; phone: string | null; createdAt: Date }
    relationship: { status: string; source: string | null }
    tags: Array<{ name: string }>
  }>,
): string {
  const header = ["Name", "Email", "Phone", "Status", "Source", "Tags", "Created"]
  const escape = (v: string | null | undefined): string => {
    if (v === null || v === undefined) return ""
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const body = rows.map((r) =>
    [
      escape(r.client.fullName),
      escape(r.client.email),
      escape(r.client.phone),
      escape(r.relationship.status),
      escape(r.relationship.source),
      escape(r.tags.map((t) => t.name).join(", ")),
      escape(r.client.createdAt.toISOString()),
    ].join(","),
  )
  return [header.join(","), ...body].join("\n")
}
