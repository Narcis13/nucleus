import { schedules } from "@trigger.dev/sdk"
import { and, eq, sql } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { automations, professionalClients } from "@/lib/db/schema"
import { evaluateTrigger } from "@/lib/automations/engine"

// ─────────────────────────────────────────────────────────────────────────────
// Trigger.dev v4 — daily inactive-client scan.
//
// For each active `client_inactive` automation, finds every active client of
// the owning professional whose latest activity is older than the
// automation's `inactiveDays` threshold, then fires the engine. The engine's
// log row is the per-firing audit trail.
//
// "Activity" is the most recent of:
//   · the professional↔client relationship start (floor)
//   · the latest message in a conversation between the two parties
//
// Broader signals (invoices, forms, appointments) can be added later; the
// subquery approach keeps per-pro latency bounded.
// ─────────────────────────────────────────────────────────────────────────────
export const inactiveClientCheckerTask = schedules.task({
  id: "automations.inactive-client-checker",
  cron: "30 9 * * *",
  run: async () => {
    const rows = await dbAdmin
      .select()
      .from(automations)
      .where(
        and(
          eq(automations.triggerType, "client_inactive"),
          eq(automations.isActive, true),
        ),
      )
    if (rows.length === 0) return { evaluated: 0, fired: 0 }

    let fired = 0
    for (const automation of rows) {
      const config = (automation.triggerConfig ?? {}) as {
        inactiveDays?: number
      }
      const days =
        typeof config.inactiveDays === "number" ? config.inactiveDays : 30
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const candidates = await dbAdmin
        .select({
          clientId: professionalClients.clientId,
          lastActivity: sql<Date>`greatest(
            ${professionalClients.createdAt},
            coalesce(
              (
                select max(m.created_at) from public.messages m
                inner join public.conversations c on c.id = m.conversation_id
                where c.client_id = ${professionalClients.clientId}
                  and c.professional_id = ${automation.professionalId}
              ),
              ${professionalClients.createdAt}
            )
          )`,
        })
        .from(professionalClients)
        .where(
          and(
            eq(professionalClients.professionalId, automation.professionalId),
            eq(professionalClients.status, "active"),
          ),
        )

      for (const row of candidates) {
        if (!row.lastActivity) continue
        if (new Date(row.lastActivity) > threshold) continue
        const daysInactive = Math.floor(
          (Date.now() - new Date(row.lastActivity).getTime()) /
            (24 * 60 * 60 * 1000),
        )
        await evaluateTrigger("client_inactive", {
          type: "client_inactive",
          professionalId: automation.professionalId,
          clientId: row.clientId,
          daysInactive,
        })
        fired += 1
      }
    }

    return { evaluated: rows.length, fired }
  },
})
