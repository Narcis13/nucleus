import {
  expandMergeTags,
  getCampaignTemplate
} from "./chunk-YBODE3O7.mjs";
import {
  NotificationEmail
} from "./chunk-UOTQOTHC.mjs";
import {
  and,
  automationLogs,
  automations,
  clientTags,
  clients,
  dbAdmin,
  env,
  eq,
  formAssignments,
  fromAddress,
  getResend,
  inArray,
  init_server_only,
  leadStages,
  leads,
  notifications,
  professionalClients,
  professionals
} from "./chunk-BH5TO44N.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// lib/automations/engine.ts
init_esm();
init_server_only();
async function evaluateTrigger(type, payload) {
  if (type !== payload.type) {
    throw new Error(
      `evaluateTrigger: mismatched type ${type} vs payload.type ${payload.type}`
    );
  }
  const rows = await dbAdmin.select().from(automations).where(
    and(
      eq(automations.professionalId, payload.professionalId),
      eq(automations.triggerType, type),
      eq(automations.isActive, true)
    )
  );
  if (rows.length === 0) return { matched: 0, enqueued: 0 };
  const targetId = resolveTargetId(payload);
  let matched = 0;
  let enqueued = 0;
  for (const row of rows) {
    const config = row.triggerConfig ?? {};
    const passes = await evaluateConditions(
      config.conditions ?? {},
      payload
    );
    if (!passes) continue;
    matched += 1;
    const [log] = await dbAdmin.insert(automationLogs).values({
      automationId: row.id,
      targetId: targetId ?? null,
      status: "matched"
    }).returning();
    const ok = await enqueueChain({
      automationId: row.id,
      logId: log?.id ?? null,
      context: buildContext(payload)
    });
    if (ok) enqueued += 1;
  }
  return { matched, enqueued };
}
__name(evaluateTrigger, "evaluateTrigger");
async function executeAction(action, context) {
  switch (action.type) {
    case "send_email":
      await runSendEmail(action, context);
      return;
    case "send_notification":
      await runSendNotification(action, context);
      return;
    case "assign_form":
      await runAssignForm(action, context);
      return;
    case "add_tag":
      await runAddTag(action, context);
      return;
    case "remove_tag":
      await runRemoveTag(action, context);
      return;
    case "move_lead_to_stage":
      await runMoveLeadToStage(action, context);
      return;
    case "create_task":
      await runCreateTask(action, context);
      return;
    case "wait":
      return;
  }
}
__name(executeAction, "executeAction");
async function processAutomationChain(automationId, targetId) {
  const [row] = await dbAdmin.select().from(automations).where(eq(automations.id, automationId)).limit(1);
  if (!row) throw new Error(`automation ${automationId} not found`);
  const actions = parseActions(row.actions);
  const targetsLead = row.triggerType === "new_lead";
  const context = {
    professionalId: row.professionalId,
    clientId: targetsLead ? null : targetId,
    leadId: targetsLead ? targetId : null
  };
  const [log] = await dbAdmin.insert(automationLogs).values({
    automationId: row.id,
    targetId,
    status: "running"
  }).returning();
  try {
    for (const action of actions) {
      await executeAction(action, context);
    }
    if (log?.id) {
      await dbAdmin.update(automationLogs).set({ status: "completed" }).where(eq(automationLogs.id, log.id));
    }
  } catch (err) {
    console.error(err, { tags: { automation: "chain" } });
    if (log?.id) {
      await dbAdmin.update(automationLogs).set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err)
      }).where(eq(automationLogs.id, log.id));
    }
    throw err;
  }
}
__name(processAutomationChain, "processAutomationChain");
async function evaluateConditions(conditions, payload) {
  if (payload.type === "form_submitted" && conditions.formId && conditions.formId !== payload.formId) {
    return false;
  }
  if (conditions.planTier) {
    const [pro] = await dbAdmin.select({ plan: professionals.plan }).from(professionals).where(eq(professionals.id, payload.professionalId)).limit(1);
    if (!pro || pro.plan !== conditions.planTier) return false;
  }
  const clientId = resolveClientId(payload);
  if (clientId) {
    if (conditions.clientStatus) {
      const [rel] = await dbAdmin.select({ status: professionalClients.status }).from(professionalClients).where(
        and(
          eq(professionalClients.professionalId, payload.professionalId),
          eq(professionalClients.clientId, clientId)
        )
      ).limit(1);
      if (!rel || rel.status !== conditions.clientStatus) return false;
    }
    if (conditions.tagIds && conditions.tagIds.length > 0) {
      const matched = await dbAdmin.select({ id: clientTags.tagId }).from(clientTags).where(
        and(
          eq(clientTags.clientId, clientId),
          inArray(clientTags.tagId, conditions.tagIds)
        )
      ).limit(1);
      if (matched.length === 0) return false;
    }
  } else if (conditions.tagIds?.length || conditions.clientStatus) {
    return false;
  }
  if (payload.type === "new_lead" && conditions.leadSource) {
    const [lead] = await dbAdmin.select({ source: leads.source }).from(leads).where(eq(leads.id, payload.leadId)).limit(1);
    if (!lead || lead.source !== conditions.leadSource) return false;
  }
  return true;
}
__name(evaluateConditions, "evaluateConditions");
async function enqueueChain(args) {
  if (!env.TRIGGER_SECRET_KEY) {
    try {
      await processAutomationChain(
        args.automationId,
        args.context.clientId ?? args.context.leadId ?? null
      );
      return true;
    } catch {
      return false;
    }
  }
  try {
    const { tasks } = await import("./v3-ID4MMCX6.mjs");
    await tasks.trigger("automations.run-chain", {
      automationId: args.automationId,
      logId: args.logId,
      context: args.context
    });
    return true;
  } catch (err) {
    console.error(err, { tags: { automation: "enqueue" } });
    return false;
  }
}
__name(enqueueChain, "enqueueChain");
async function runSendEmail(action, context) {
  const resend = getResend();
  if (!resend) return;
  const recipient = await resolveEmailRecipient(context);
  if (!recipient) return;
  const template = getCampaignTemplate(action.templateKey);
  const [pro] = await dbAdmin.select({ fullName: professionals.fullName }).from(professionals).where(eq(professionals.id, context.professionalId)).limit(1);
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const html = expandMergeTags(template.body, {
    client_name: recipient.fullName,
    professional_name: pro?.fullName ?? null,
    portal_url: `${base}/portal`,
    booking_url: `${base}/portal/calendar`
  });
  const subject = action.subject?.trim() ? action.subject : expandMergeTags(template.subject, {
    client_name: recipient.fullName,
    professional_name: pro?.fullName ?? null
  });
  await resend.emails.send({
    from: fromAddress(),
    to: [recipient.email],
    subject,
    html
  });
}
__name(runSendEmail, "runSendEmail");
async function runSendNotification(action, context) {
  const resend = getResend();
  await dbAdmin.insert(notifications).values({
    userId: context.professionalId,
    userType: "professional",
    type: "system",
    title: action.title,
    body: action.body ?? null,
    link: "/dashboard/automations"
  });
  if (resend) {
    const [pro] = await dbAdmin.select({ email: professionals.email, fullName: professionals.fullName }).from(professionals).where(eq(professionals.id, context.professionalId)).limit(1);
    if (pro?.email) {
      await resend.emails.send({
        from: fromAddress(),
        to: [pro.email],
        subject: action.title,
        react: NotificationEmail({
          recipientName: pro.fullName,
          title: action.title,
          body: action.body ?? null,
          link: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/automations`,
          appUrl: env.NEXT_PUBLIC_APP_URL
        })
      });
    }
  }
}
__name(runSendNotification, "runSendNotification");
async function runAssignForm(action, context) {
  if (!context.clientId || !action.formId) return;
  const dueDate = action.dueDays ? new Date(Date.now() + action.dueDays * 24 * 60 * 60 * 1e3) : null;
  await dbAdmin.insert(formAssignments).values({
    formId: action.formId,
    clientId: context.clientId,
    professionalId: context.professionalId,
    dueDate
  });
}
__name(runAssignForm, "runAssignForm");
async function runAddTag(action, context) {
  if (!context.clientId) return;
  await dbAdmin.insert(clientTags).values({ clientId: context.clientId, tagId: action.tagId }).onConflictDoNothing();
}
__name(runAddTag, "runAddTag");
async function runRemoveTag(action, context) {
  if (!context.clientId) return;
  await dbAdmin.delete(clientTags).where(
    and(
      eq(clientTags.clientId, context.clientId),
      eq(clientTags.tagId, action.tagId)
    )
  );
}
__name(runRemoveTag, "runRemoveTag");
async function runMoveLeadToStage(action, context) {
  if (!context.leadId) return;
  const [stage] = await dbAdmin.select({ id: leadStages.id }).from(leadStages).where(
    and(
      eq(leadStages.id, action.stageId),
      eq(leadStages.professionalId, context.professionalId)
    )
  ).limit(1);
  if (!stage) return;
  await dbAdmin.update(leads).set({ stageId: action.stageId }).where(eq(leads.id, context.leadId));
}
__name(runMoveLeadToStage, "runMoveLeadToStage");
async function runCreateTask(action, context) {
  await dbAdmin.insert(notifications).values({
    userId: context.professionalId,
    userType: "professional",
    type: "system",
    title: action.title,
    body: action.body ?? null,
    link: "/dashboard/automations"
  });
}
__name(runCreateTask, "runCreateTask");
function resolveTargetId(payload) {
  switch (payload.type) {
    case "new_client":
      return payload.clientId;
    case "new_lead":
      return payload.leadId;
    case "form_submitted":
      return payload.clientId ?? null;
    case "appointment_completed":
      return payload.clientId ?? null;
    case "client_inactive":
      return payload.clientId;
    case "custom_date":
      return payload.clientId;
  }
}
__name(resolveTargetId, "resolveTargetId");
function resolveClientId(payload) {
  switch (payload.type) {
    case "new_client":
      return payload.clientId;
    case "form_submitted":
    case "appointment_completed":
      return payload.clientId ?? null;
    case "client_inactive":
    case "custom_date":
      return payload.clientId;
    default:
      return null;
  }
}
__name(resolveClientId, "resolveClientId");
function buildContext(payload) {
  const base = {
    professionalId: payload.professionalId,
    triggerPayload: payload
  };
  switch (payload.type) {
    case "new_client":
      return { ...base, clientId: payload.clientId };
    case "new_lead":
      return { ...base, leadId: payload.leadId };
    case "form_submitted":
      return {
        ...base,
        clientId: payload.clientId ?? null,
        formId: payload.formId
      };
    case "appointment_completed":
      return {
        ...base,
        clientId: payload.clientId ?? null,
        appointmentId: payload.appointmentId
      };
    case "client_inactive":
    case "custom_date":
      return { ...base, clientId: payload.clientId };
  }
}
__name(buildContext, "buildContext");
async function resolveEmailRecipient(context) {
  if (context.clientId) {
    const [c] = await dbAdmin.select({ email: clients.email, fullName: clients.fullName }).from(clients).where(eq(clients.id, context.clientId)).limit(1);
    if (c?.email) return { email: c.email, fullName: c.fullName };
  }
  if (context.leadId) {
    const [l] = await dbAdmin.select({ email: leads.email, fullName: leads.fullName }).from(leads).where(eq(leads.id, context.leadId)).limit(1);
    if (l?.email) return { email: l.email, fullName: l.fullName };
  }
  return null;
}
__name(resolveEmailRecipient, "resolveEmailRecipient");
function parseActions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry;
    switch (e.type) {
      case "send_email": {
        const v = entry;
        if (typeof v.templateKey === "string") {
          out.push({
            type: "send_email",
            templateKey: v.templateKey,
            subject: typeof v.subject === "string" ? v.subject : null
          });
        }
        break;
      }
      case "send_notification": {
        const v = entry;
        if (typeof v.title === "string") {
          out.push({
            type: "send_notification",
            title: v.title,
            body: typeof v.body === "string" ? v.body : null
          });
        }
        break;
      }
      case "assign_form": {
        const v = entry;
        if (typeof v.formId === "string") {
          out.push({
            type: "assign_form",
            formId: v.formId,
            dueDays: typeof v.dueDays === "number" ? v.dueDays : null
          });
        }
        break;
      }
      case "add_tag": {
        const v = entry;
        if (typeof v.tagId === "string") {
          out.push({ type: "add_tag", tagId: v.tagId });
        }
        break;
      }
      case "remove_tag": {
        const v = entry;
        if (typeof v.tagId === "string") {
          out.push({ type: "remove_tag", tagId: v.tagId });
        }
        break;
      }
      case "move_lead_to_stage": {
        const v = entry;
        if (typeof v.stageId === "string") {
          out.push({ type: "move_lead_to_stage", stageId: v.stageId });
        }
        break;
      }
      case "create_task": {
        const v = entry;
        if (typeof v.title === "string") {
          out.push({
            type: "create_task",
            title: v.title,
            body: typeof v.body === "string" ? v.body : null
          });
        }
        break;
      }
      case "wait": {
        const v = entry;
        if (typeof v.days === "number" && v.days > 0) {
          out.push({ type: "wait", days: v.days });
        }
        break;
      }
    }
  }
  return out;
}
__name(parseActions, "parseActions");

export {
  evaluateTrigger,
  executeAction,
  parseActions
};
//# sourceMappingURL=chunk-K445XYSS.mjs.map
