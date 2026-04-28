import {
  executeAction,
  parseActions
} from "../../../../../chunk-K445XYSS.mjs";
import "../../../../../chunk-YBODE3O7.mjs";
import "../../../../../chunk-UOTQOTHC.mjs";
import {
  automationLogs,
  automations,
  dbAdmin,
  eq
} from "../../../../../chunk-BH5TO44N.mjs";
import "../../../../../chunk-3OYPF3ZS.mjs";
import "../../../../../chunk-5FLGYLYZ.mjs";
import {
  task,
  wait
} from "../../../../../chunk-O6KEYEYL.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// trigger/jobs/automation-runner.ts
init_esm();
var runAutomationChainTask = task({
  id: "automations.run-chain",
  retry: { maxAttempts: 2 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const [automation] = await dbAdmin.select().from(automations).where(eq(automations.id, payload.automationId)).limit(1);
    if (!automation) {
      return { ok: false, reason: "automation-missing" };
    }
    const actions = parseActions(automation.actions);
    if (actions.length === 0) {
      return { ok: true, steps: 0 };
    }
    if (payload.logId) {
      await dbAdmin.update(automationLogs).set({ status: "running" }).where(eq(automationLogs.id, payload.logId));
    }
    try {
      for (const action of actions) {
        if (action.type === "wait") {
          await wait.for({ days: action.days });
          continue;
        }
        await executeAction(action, payload.context);
      }
      if (payload.logId) {
        await dbAdmin.update(automationLogs).set({ status: "completed" }).where(eq(automationLogs.id, payload.logId));
      }
      return { ok: true, steps: actions.length };
    } catch (err) {
      if (payload.logId) {
        await dbAdmin.update(automationLogs).set({
          status: "failed",
          error: err instanceof Error ? err.message : String(err)
        }).where(eq(automationLogs.id, payload.logId));
      }
      throw err;
    }
  }, "run")
});
export {
  runAutomationChainTask
};
//# sourceMappingURL=automation-runner.mjs.map
