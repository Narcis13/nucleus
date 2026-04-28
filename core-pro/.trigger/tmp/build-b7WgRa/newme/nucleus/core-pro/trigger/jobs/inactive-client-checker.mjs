import {
  evaluateTrigger
} from "../../../../../chunk-K445XYSS.mjs";
import "../../../../../chunk-YBODE3O7.mjs";
import "../../../../../chunk-UOTQOTHC.mjs";
import {
  and,
  automations,
  dbAdmin,
  eq,
  professionalClients,
  sql
} from "../../../../../chunk-BH5TO44N.mjs";
import "../../../../../chunk-3OYPF3ZS.mjs";
import "../../../../../chunk-5FLGYLYZ.mjs";
import {
  schedules_exports
} from "../../../../../chunk-O6KEYEYL.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// trigger/jobs/inactive-client-checker.ts
init_esm();
var inactiveClientCheckerTask = schedules_exports.task({
  id: "automations.inactive-client-checker",
  cron: "30 9 * * *",
  run: /* @__PURE__ */ __name(async () => {
    const rows = await dbAdmin.select().from(automations).where(
      and(
        eq(automations.triggerType, "client_inactive"),
        eq(automations.isActive, true)
      )
    );
    if (rows.length === 0) return { evaluated: 0, fired: 0 };
    let fired = 0;
    for (const automation of rows) {
      const config = automation.triggerConfig ?? {};
      const days = typeof config.inactiveDays === "number" ? config.inactiveDays : 30;
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
      const candidates = await dbAdmin.select({
        clientId: professionalClients.clientId,
        lastActivity: sql`greatest(
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
          )`
      }).from(professionalClients).where(
        and(
          eq(professionalClients.professionalId, automation.professionalId),
          eq(professionalClients.status, "active")
        )
      );
      for (const row of candidates) {
        if (!row.lastActivity) continue;
        if (new Date(row.lastActivity) > threshold) continue;
        const daysInactive = Math.floor(
          (Date.now() - new Date(row.lastActivity).getTime()) / (24 * 60 * 60 * 1e3)
        );
        await evaluateTrigger("client_inactive", {
          type: "client_inactive",
          professionalId: automation.professionalId,
          clientId: row.clientId,
          daysInactive
        });
        fired += 1;
      }
    }
    return { evaluated: rows.length, fired };
  }, "run")
});
export {
  inactiveClientCheckerTask
};
//# sourceMappingURL=inactive-client-checker.mjs.map
