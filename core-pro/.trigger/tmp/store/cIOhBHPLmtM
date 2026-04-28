import {
  render
} from "../../../../../chunk-SGHGXB55.mjs";
import "../../../../../chunk-4MIBX6SK.mjs";
import "../../../../../chunk-K6V5PMDA.mjs";
import {
  NotificationEmail
} from "../../../../../chunk-UOTQOTHC.mjs";
import {
  InvoiceEmail,
  and,
  clientSettings,
  clients,
  dbAdmin,
  desc,
  env,
  eq,
  fromAddress,
  getResend,
  inArray,
  init_server_only,
  invoices,
  lt,
  makeEmailTranslator,
  notifications,
  paymentReminders,
  professionalSettings,
  professionals,
  pushSubscriptions,
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

// trigger/jobs/invoices.ts
init_esm();

// lib/invoices/overdue-checker.ts
init_esm();
init_server_only();

// lib/db/queries/invoices.ts
init_esm();
init_server_only();

// lib/db/queries/professionals.ts
init_esm();
init_server_only();

// lib/db/queries/invoices.ts
async function sweepOverdueInvoices() {
  const flipped = await dbAdmin.update(invoices).set({ status: "overdue" }).where(
    and(
      inArray(invoices.status, ["sent", "viewed"]),
      lt(invoices.dueDate, sql`current_date`)
    )
  ).returning({ id: invoices.id });
  const openOverdue = await dbAdmin.select({
    invoice: invoices,
    client: {
      id: clients.id,
      email: clients.email,
      fullName: clients.fullName
    },
    professional: {
      id: professionals.id,
      email: professionals.email,
      fullName: professionals.fullName
    }
  }).from(invoices).leftJoin(clients, eq(clients.id, invoices.clientId)).leftJoin(professionals, eq(professionals.id, invoices.professionalId)).where(eq(invoices.status, "overdue"));
  const items = openOverdue.map((row) => {
    const dueMs = new Date(row.invoice.dueDate).getTime();
    const nowMs = Date.now();
    const daysOverdue = Math.max(
      0,
      Math.floor((nowMs - dueMs) / (1e3 * 60 * 60 * 24))
    );
    return {
      invoice: row.invoice,
      daysOverdue,
      client: row.client?.id ? row.client : null,
      professional: row.professional?.id ? row.professional : null
    };
  });
  return { flipped: flipped.length, items };
}
__name(sweepOverdueInvoices, "sweepOverdueInvoices");
async function getRemindersForInvoice(invoiceId) {
  const rows = await dbAdmin.select().from(paymentReminders).where(eq(paymentReminders.invoiceId, invoiceId)).orderBy(desc(paymentReminders.sentAt));
  return rows;
}
__name(getRemindersForInvoice, "getRemindersForInvoice");
async function logReminder(input) {
  const [row] = await dbAdmin.insert(paymentReminders).values({
    invoiceId: input.invoiceId,
    professionalId: input.professionalId,
    reminderType: input.reminderType,
    daysOverdue: input.daysOverdue
  }).returning();
  if (!row) throw new Error("Failed to log reminder");
  return row;
}
__name(logReminder, "logReminder");

// lib/invoices/emails.ts
init_esm();
init_server_only();

// lib/notifications/send.ts
init_esm();
init_server_only();

// lib/db/queries/notifications.ts
init_esm();
init_server_only();
async function createNotification(input) {
  const [row] = await dbAdmin.insert(notifications).values(input).returning();
  if (!row) throw new Error("Failed to insert notification");
  return row;
}
__name(createNotification, "createNotification");

// lib/db/queries/notification-settings.ts
init_esm();
init_server_only();
async function getRecipientContact(key) {
  if (key.userType === "professional") {
    const rows2 = await dbAdmin.select({
      email: professionals.email,
      fullName: professionals.fullName,
      timezone: professionals.timezone,
      prefs: professionalSettings.notificationPreferences
    }).from(professionals).leftJoin(
      professionalSettings,
      eq(professionalSettings.professionalId, professionals.id)
    ).where(eq(professionals.id, key.userId)).limit(1);
    const row2 = rows2[0];
    if (!row2) return null;
    return {
      email: row2.email,
      fullName: row2.fullName,
      timezone: row2.timezone,
      preferences: row2.prefs ?? null
    };
  }
  const rows = await dbAdmin.select({
    email: clients.email,
    fullName: clients.fullName,
    prefs: clientSettings.notificationPreferences
  }).from(clients).leftJoin(clientSettings, eq(clientSettings.clientId, clients.id)).where(eq(clients.id, key.userId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    email: row.email,
    fullName: row.fullName,
    timezone: null,
    // Clients inherit their pro's timezone; fine to default UTC in quiet-hours math.
    preferences: row.prefs ?? null
  };
}
__name(getRecipientContact, "getRecipientContact");

// lib/db/queries/push-subscriptions.ts
init_esm();
init_server_only();
async function listPushSubscriptionsForUser(args) {
  return dbAdmin.select().from(pushSubscriptions).where(
    and(
      eq(pushSubscriptions.userId, args.userId),
      eq(pushSubscriptions.userType, args.userType)
    )
  );
}
__name(listPushSubscriptionsForUser, "listPushSubscriptionsForUser");
async function deletePushSubscriptionByEndpointAdmin(endpoint) {
  await dbAdmin.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
__name(deletePushSubscriptionByEndpointAdmin, "deletePushSubscriptionByEndpointAdmin");

// lib/notifications/preferences.ts
init_esm();
init_server_only();
var DEFAULT_PREFERENCES = {
  per_type: {
    message: true,
    appointment: true,
    form: true,
    lead: true,
    invoice: true,
    document: true,
    system: true
  },
  per_channel: {
    in_app: true,
    email: true,
    push: true
  },
  quiet_hours: {
    enabled: false,
    start: "22:00",
    end: "07:00"
  }
};
function isTypeEnabled(prefs, type) {
  const v = prefs?.per_type?.[type];
  return v === void 0 ? true : v;
}
__name(isTypeEnabled, "isTypeEnabled");
function isChannelEnabled(prefs, channel) {
  const v = prefs?.per_channel?.[channel];
  return v === void 0 ? true : v;
}
__name(isChannelEnabled, "isChannelEnabled");
function resolveChannels(args) {
  if (!isTypeEnabled(args.prefs, args.type)) return [];
  const quiet = args.prefs?.quiet_hours ?? DEFAULT_PREFERENCES.quiet_hours;
  const inQuiet = quiet.enabled ? isWithinQuietHours({
    quiet,
    timezone: args.timezone ?? "UTC",
    now: args.now ?? /* @__PURE__ */ new Date()
  }) : false;
  return args.requested.filter((channel) => {
    if (!isChannelEnabled(args.prefs, channel)) return false;
    if (inQuiet && (channel === "email" || channel === "push")) return false;
    return true;
  });
}
__name(resolveChannels, "resolveChannels");
function isWithinQuietHours(args) {
  const { quiet, timezone, now } = args;
  if (!quiet.enabled) return false;
  const start = parseHHMM(quiet.start);
  const end = parseHHMM(quiet.end);
  if (start === null || end === null) return false;
  const current = getLocalMinutes(now, timezone);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}
__name(isWithinQuietHours, "isWithinQuietHours");
function parseHHMM(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}
__name(parseHHMM, "parseHHMM");
function getLocalMinutes(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0";
  const hours = Number(hourStr) === 24 ? 0 : Number(hourStr);
  return hours * 60 + Number(minuteStr);
}
__name(getLocalMinutes, "getLocalMinutes");

// lib/notifications/push.ts
init_esm();
init_server_only();
async function sendPush(subscription, payload) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? `mailto:${process.env.RESEND_FROM_EMAIL ?? ""}`;
  if (!publicKey || !privateKey) {
    warnOnce(
      "push.vapid-missing",
      "Web Push skipped — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set."
    );
    return { delivered: false, reason: "vapid-not-configured" };
  }
  const webpush = await loadWebPush();
  if (!webpush) {
    warnOnce(
      "push.webpush-missing",
      "Web Push skipped — `web-push` package is not installed. Run `npm i web-push` to enable delivery."
    );
    return { delivered: false, reason: "web-push-not-installed" };
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      JSON.stringify(payload)
    );
    return { delivered: true };
  } catch (err) {
    const status = err.statusCode;
    if (status === 404 || status === 410) {
      await deletePushSubscriptionByEndpointAdmin(subscription.endpoint);
      return { delivered: false, reason: "subscription-expired" };
    }
    return { delivered: false, reason: `push-error:${status ?? "unknown"}` };
  }
}
__name(sendPush, "sendPush");
var cached;
async function loadWebPush() {
  if (cached !== void 0) return cached;
  try {
    const moduleName = "web-push";
    const mod = await import(
      /* webpackIgnore: true */
      moduleName
    );
    cached = mod.default ?? mod;
  } catch {
    cached = null;
  }
  return cached;
}
__name(loadWebPush, "loadWebPush");
var warned = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[notifications] ${message}`);
}
__name(warnOnce, "warnOnce");

// lib/notifications/send.ts
var DEFAULT_CHANNELS = ["in_app", "email", "push"];
async function sendNotification(input) {
  const requested = input.channels ?? DEFAULT_CHANNELS;
  const recipientKey = {
    userId: input.userId,
    userType: input.userType
  };
  const contact = await getRecipientContact(recipientKey);
  const allowed = contact ? resolveChannels({
    requested,
    prefs: contact.preferences,
    type: input.type,
    timezone: contact.timezone
  }) : requested.slice();
  const skipped = requested.filter((c) => !allowed.includes(c));
  const result = {
    notification: null,
    delivered: { in_app: false, email: false, push: { attempted: 0, delivered: 0 } },
    skipped
  };
  if (requested.includes("in_app")) {
    try {
      result.notification = await createNotification({
        userId: input.userId,
        userType: input.userType,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        metadata: input.metadata ?? null
      });
      result.delivered.in_app = true;
    } catch (err) {
      console.error(err, { tags: { notification: "in_app" } });
    }
  }
  if (allowed.includes("email") && contact?.email) {
    try {
      const resend = getResend();
      if (resend) {
        await resend.emails.send({
          from: fromAddress(),
          to: [contact.email],
          subject: input.title,
          react: NotificationEmail({
            recipientName: contact.fullName ?? null,
            title: input.title,
            body: input.body ?? null,
            link: absoluteUrl(input.link),
            appUrl: env.NEXT_PUBLIC_APP_URL
          })
        });
        result.delivered.email = true;
      }
    } catch (err) {
      console.error(err, { tags: { notification: "email" } });
    }
  }
  if (allowed.includes("push")) {
    try {
      const subs = await listPushSubscriptionsForUser(recipientKey);
      result.delivered.push.attempted = subs.length;
      for (const sub of subs) {
        const res = await sendPush(sub, {
          title: input.title,
          body: input.body ?? void 0,
          url: absoluteUrl(input.link),
          tag: `${input.type}:${result.notification?.id ?? input.userId}`
        });
        if (res.delivered) result.delivered.push.delivered += 1;
      }
    } catch (err) {
      console.error(err, { tags: { notification: "push" } });
    }
  }
  return result;
}
__name(sendNotification, "sendNotification");
function absoluteUrl(link) {
  if (!link) return void 0;
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const path = link.startsWith("/") ? link : `/${link}`;
  return `${base}${path}`;
}
__name(absoluteUrl, "absoluteUrl");

// lib/invoices/emails.ts
async function fetchInvoiceContext(invoiceId) {
  const rows = await dbAdmin.select({
    invoice: invoices,
    client: {
      id: clients.id,
      email: clients.email,
      fullName: clients.fullName,
      locale: clients.locale
    },
    professional: {
      id: professionals.id,
      email: professionals.email,
      fullName: professionals.fullName,
      branding: professionals.branding,
      locale: professionals.locale
    }
  }).from(invoices).leftJoin(clients, eq(clients.id, invoices.clientId)).leftJoin(professionals, eq(professionals.id, invoices.professionalId)).where(eq(invoices.id, invoiceId)).limit(1);
  const row = rows[0];
  if (!row || !row.professional?.id) return null;
  return {
    invoice: row.invoice,
    client: row.client?.id ? row.client : null,
    professional: {
      id: row.professional.id,
      email: row.professional.email,
      fullName: row.professional.fullName,
      branding: row.professional.branding ?? null,
      locale: row.professional.locale ?? null
    }
  };
}
__name(fetchInvoiceContext, "fetchInvoiceContext");
function portalUrlFor(invoice) {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal/invoices/${invoice.id}`;
}
__name(portalUrlFor, "portalUrlFor");
function subjectFor(kind, invoice, locale) {
  const t = makeEmailTranslator(locale);
  switch (kind) {
    case "issued":
      return t("emails.invoice.subject", {
        number: invoice.invoiceNumber,
        sender: ""
      }).replace(/ $/, "");
    case "receipt":
      return t("emails.invoiceSent.subject", { number: invoice.invoiceNumber });
    default:
      return t("emails.invoiceReminder.subject", {
        number: invoice.invoiceNumber
      });
  }
}
__name(subjectFor, "subjectFor");
function propsForInvoice(ctx, kind, daysOverdue) {
  const total = Number(ctx.invoice.total);
  const paid = Number(ctx.invoice.paidAmount);
  const lineItems = ctx.invoice.lineItems ?? [];
  const mapped = lineItems.map((li) => ({
    description: li.description,
    quantity: Number(li.quantity) || 0,
    unit_price: Number(li.unit_price) || 0,
    amount: Number(li.amount) || 0
  }));
  return {
    kind,
    invoiceNumber: ctx.invoice.invoiceNumber,
    recipientName: ctx.client?.fullName ?? "there",
    professionalName: ctx.professional.fullName,
    branding: ctx.professional.branding,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    locale: ctx.client?.locale ?? ctx.professional.locale ?? null,
    lineItems: mapped,
    subtotal: Number(ctx.invoice.subtotal),
    taxAmount: Number(ctx.invoice.taxAmount),
    discount: Number(ctx.invoice.discount),
    total,
    paidAmount: paid,
    balanceDue: Math.max(0, total - paid),
    currency: ctx.invoice.currency,
    issueDate: ctx.invoice.issueDate,
    dueDate: ctx.invoice.dueDate,
    daysOverdue,
    terms: ctx.invoice.terms,
    notes: ctx.invoice.notes,
    paymentMethod: ctx.invoice.paymentMethod,
    paymentReference: ctx.invoice.paymentReference,
    portalUrl: portalUrlFor(ctx.invoice)
  };
}
__name(propsForInvoice, "propsForInvoice");
async function dispatch(ctx, kind, options = {}) {
  const resend = getResend();
  if (!resend) return { sent: false };
  const recipient = ctx.client?.email;
  if (!recipient) return { sent: false };
  try {
    const html = await render(
      InvoiceEmail(propsForInvoice(ctx, kind, options.daysOverdue ?? null))
    );
    const recipientLocale = ctx.client?.locale ?? ctx.professional.locale ?? null;
    await resend.emails.send({
      from: fromAddress(),
      to: [recipient],
      subject: subjectFor(kind, ctx.invoice, recipientLocale),
      html
    });
    return { sent: true };
  } catch (err) {
    console.error(err, { tags: { invoice_email: kind } });
    return { sent: false };
  }
}
__name(dispatch, "dispatch");
async function sendReminderEmail(args) {
  const ctx = await fetchInvoiceContext(args.invoiceId);
  if (!ctx) return { sent: false };
  const kindByTier = {
    friendly: "reminder_friendly",
    firm: "reminder_firm",
    final: "reminder_final"
  };
  const result = await dispatch(ctx, kindByTier[args.tier], {
    daysOverdue: args.daysOverdue
  });
  if (result.sent && ctx.client?.id) {
    await sendNotification({
      userId: ctx.client.id,
      userType: "client",
      type: "invoice_reminder",
      title: `Reminder: Invoice ${ctx.invoice.invoiceNumber}`,
      body: `Due ${args.daysOverdue} day${args.daysOverdue === 1 ? "" : "s"} ago.`,
      link: `/portal/invoices/${ctx.invoice.id}`
    }).catch(() => {
    });
  }
  return result;
}
__name(sendReminderEmail, "sendReminderEmail");

// lib/invoices/overdue-checker.ts
function tierFor(daysOverdue) {
  if (daysOverdue >= 14) return "final";
  if (daysOverdue >= 7) return "firm";
  if (daysOverdue >= 1) return "friendly";
  return null;
}
__name(tierFor, "tierFor");
async function runOverdueChecker() {
  const result = await sweepOverdueInvoices();
  let remindersSent = 0;
  let remindersSkipped = 0;
  for (const item of result.items) {
    const tier = tierFor(item.daysOverdue);
    if (!tier) continue;
    try {
      const past = await getRemindersForInvoice(item.invoice.id);
      const alreadySentThisTier = past.some((r) => r.reminderType === tier);
      if (alreadySentThisTier) {
        remindersSkipped += 1;
        continue;
      }
      const { sent } = await sendReminderEmail({
        invoiceId: item.invoice.id,
        tier,
        daysOverdue: item.daysOverdue
      });
      if (sent) {
        await logReminder({
          invoiceId: item.invoice.id,
          professionalId: item.invoice.professionalId,
          reminderType: tier,
          daysOverdue: item.daysOverdue
        });
        remindersSent += 1;
      } else {
        remindersSkipped += 1;
      }
    } catch (err) {
      console.error(err, {
        tags: { invoice_overdue_checker: "reminder" },
        extra: { invoiceId: item.invoice.id }
      });
      remindersSkipped += 1;
    }
  }
  return {
    flippedCount: result.flipped,
    remindersSent,
    remindersSkipped
  };
}
__name(runOverdueChecker, "runOverdueChecker");

// trigger/jobs/invoices.ts
var invoiceOverdueSweep = schedules_exports.task({
  id: "invoices.overdue-sweep",
  cron: "0 9 * * *",
  run: /* @__PURE__ */ __name(async () => {
    const report = await runOverdueChecker();
    return report;
  }, "run")
});
export {
  invoiceOverdueSweep
};
//# sourceMappingURL=invoices.mjs.map
