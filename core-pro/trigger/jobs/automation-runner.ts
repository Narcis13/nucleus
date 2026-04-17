import { task, wait } from "@trigger.dev/sdk"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { automationLogs, automations } from "@/lib/db/schema"
import { executeAction, parseActions } from "@/lib/automations/engine"
import type { ActionContext } from "@/lib/automations/types"

// ─────────────────────────────────────────────────────────────────────────────
// Trigger.dev v4 — automation chain runner.
//
// `evaluateTrigger()` enqueues one `automations.run-chain` run per matched
// automation. That run walks the action list and, when it hits a `wait`
// action, suspends via `wait.for({ days: N })` so the next step resumes after
// the delay without holding a worker open.
//
// All DB access uses `dbAdmin` — Trigger tasks run without a Clerk session.
// ─────────────────────────────────────────────────────────────────────────────

type LogStatus = "matched" | "running" | "completed" | "failed"

type RunChainPayload = {
  automationId: string
  logId: string | null
  context: ActionContext
}

export const runAutomationChainTask = task({
  id: "automations.run-chain",
  retry: { maxAttempts: 2 },
  run: async (payload: RunChainPayload) => {
    const [automation] = await dbAdmin
      .select()
      .from(automations)
      .where(eq(automations.id, payload.automationId))
      .limit(1)
    if (!automation) {
      return { ok: false, reason: "automation-missing" as const }
    }

    const actions = parseActions(automation.actions)
    if (actions.length === 0) {
      return { ok: true, steps: 0 }
    }

    if (payload.logId) {
      await dbAdmin
        .update(automationLogs)
        .set({ status: "running" satisfies LogStatus })
        .where(eq(automationLogs.id, payload.logId))
    }

    try {
      for (const action of actions) {
        if (action.type === "wait") {
          await wait.for({ days: action.days })
          continue
        }
        await executeAction(action, payload.context)
      }
      if (payload.logId) {
        await dbAdmin
          .update(automationLogs)
          .set({ status: "completed" satisfies LogStatus })
          .where(eq(automationLogs.id, payload.logId))
      }
      return { ok: true, steps: actions.length }
    } catch (err) {
      if (payload.logId) {
        await dbAdmin
          .update(automationLogs)
          .set({
            status: "failed" satisfies LogStatus,
            error: err instanceof Error ? err.message : String(err),
          })
          .where(eq(automationLogs.id, payload.logId))
      }
      throw err
    }
  },
})
