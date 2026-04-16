import "server-only"

import { eq, sql, and } from "drizzle-orm"

import { withRLS } from "@/lib/db/rls"
import { documents, professionalClients } from "@/lib/db/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Usage counters for plan limit enforcement. Runs inside `withRLS` so we never
// accidentally count across tenants.
//
// `client_count` counts *active* professional_clients links (inactive clients
// don't consume a seat). `storage_used_mb` sums `documents.file_size` bytes
// and converts to MB — close enough for UI meters without a second table.
// ─────────────────────────────────────────────────────────────────────────────
export type ProfessionalUsage = {
  clientCount: number
  storageUsedMb: number
}

export async function getProfessionalUsage(
  professionalId: string,
): Promise<ProfessionalUsage> {
  return withRLS(async (tx) => {
    const clientRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(professionalClients)
      .where(
        and(
          eq(professionalClients.professionalId, professionalId),
          eq(professionalClients.status, "active"),
        ),
      )

    const storageRows = await tx
      .select({
        bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)::bigint`,
      })
      .from(documents)
      .where(eq(documents.professionalId, professionalId))

    return {
      clientCount: clientRows[0]?.count ?? 0,
      storageUsedMb: Math.round(Number(storageRows[0]?.bytes ?? 0) / (1024 * 1024)),
    }
  })
}
