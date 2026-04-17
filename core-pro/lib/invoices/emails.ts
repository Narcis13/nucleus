import "server-only"

import { render } from "@react-email/components"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { env } from "@/lib/env"
import {
  clients,
  invoices,
  professionals,
} from "@/lib/db/schema"
import {
  markInvoiceSent,
} from "@/lib/db/queries/invoices"
import { sendNotification } from "@/lib/notifications/send"
import { fromAddress, getResend } from "@/lib/resend/client"
import { makeEmailTranslator } from "@/lib/resend/translator"
import { captureException } from "@/lib/sentry"
import type { Branding, Invoice, InvoiceLineItem } from "@/types/domain"

import InvoiceEmail, {
  type InvoiceEmailKind,
  type InvoiceEmailLineItem,
} from "@/emails/invoice"

// ─────────────────────────────────────────────────────────────────────────────
// Invoice email dispatcher — one function per lifecycle email, all backed by
// the same React Email template. Uses `dbAdmin` because we may be called from
// Trigger.dev / cron where there is no Clerk session. Each invocation resolves
// the {invoice, client, professional} triple from the invoice id — callers
// don't have to carry the whole graph.
//
// Sends are best-effort: a missing Resend key returns silently, network errors
// land in Sentry. We never want an invoice action to fail because email is
// down.
// ─────────────────────────────────────────────────────────────────────────────

type InvoiceContext = {
  invoice: Invoice
  client: { id: string; email: string; fullName: string; locale: string | null } | null
  professional: {
    id: string
    email: string
    fullName: string
    branding: Branding | null
    locale: string | null
  }
}

async function fetchInvoiceContext(
  invoiceId: string,
): Promise<InvoiceContext | null> {
  const rows = await dbAdmin
    .select({
      invoice: invoices,
      client: {
        id: clients.id,
        email: clients.email,
        fullName: clients.fullName,
        locale: clients.locale,
      },
      professional: {
        id: professionals.id,
        email: professionals.email,
        fullName: professionals.fullName,
        branding: professionals.branding,
        locale: professionals.locale,
      },
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(professionals, eq(professionals.id, invoices.professionalId))
    .where(eq(invoices.id, invoiceId))
    .limit(1)
  const row = rows[0]
  if (!row || !row.professional?.id) return null
  return {
    invoice: row.invoice,
    client: row.client?.id ? row.client : null,
    professional: {
      id: row.professional.id,
      email: row.professional.email,
      fullName: row.professional.fullName,
      branding: (row.professional.branding ?? null) as Branding | null,
      locale: row.professional.locale ?? null,
    },
  }
}

function portalUrlFor(invoice: Invoice): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/portal/invoices/${invoice.id}`
}

function subjectFor(
  kind: InvoiceEmailKind,
  invoice: Invoice,
  locale: string | null,
): string {
  const t = makeEmailTranslator(locale)
  switch (kind) {
    case "issued":
      return t("emails.invoice.subject", {
        number: invoice.invoiceNumber,
        sender: "",
      }).replace(/ $/, "")
    case "receipt":
      return t("emails.invoiceSent.subject", { number: invoice.invoiceNumber })
    default:
      return t("emails.invoiceReminder.subject", {
        number: invoice.invoiceNumber,
      })
  }
}

function propsForInvoice(
  ctx: InvoiceContext,
  kind: InvoiceEmailKind,
  daysOverdue: number | null,
): Parameters<typeof InvoiceEmail>[0] {
  const total = Number(ctx.invoice.total)
  const paid = Number(ctx.invoice.paidAmount)
  const lineItems = (ctx.invoice.lineItems ?? []) as InvoiceLineItem[]
  const mapped: InvoiceEmailLineItem[] = lineItems.map((li) => ({
    description: li.description,
    quantity: Number(li.quantity) || 0,
    unit_price: Number(li.unit_price) || 0,
    amount: Number(li.amount) || 0,
  }))

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
    portalUrl: portalUrlFor(ctx.invoice),
  }
}

async function dispatch(
  ctx: InvoiceContext,
  kind: InvoiceEmailKind,
  options: { daysOverdue?: number | null } = {},
): Promise<{ sent: boolean }> {
  const resend = getResend()
  if (!resend) return { sent: false }

  const recipient = ctx.client?.email
  if (!recipient) return { sent: false }

  try {
    const html = await render(
      InvoiceEmail(propsForInvoice(ctx, kind, options.daysOverdue ?? null)),
    )
    const recipientLocale =
      ctx.client?.locale ?? ctx.professional.locale ?? null
    await resend.emails.send({
      from: fromAddress(),
      to: [recipient],
      subject: subjectFor(kind, ctx.invoice, recipientLocale),
      html,
    })
    return { sent: true }
  } catch (err) {
    captureException(err, { tags: { invoice_email: kind } })
    return { sent: false }
  }
}

// ── Entry points ────────────────────────────────────────────────────────────

export async function sendInvoiceEmail(args: {
  invoiceId: string
}): Promise<void> {
  const ctx = await fetchInvoiceContext(args.invoiceId)
  if (!ctx) return
  await dispatch(ctx, "issued")
  // Stamp `sent_at` + flip status so the UI reflects reality. Uses the
  // RLS-bypassing sister function because we might be running without a user
  // session.
  await dbAdmin
    .update(invoices)
    .set({
      sentAt: new Date(),
      status:
        ctx.invoice.status === "draft" ? "sent" : ctx.invoice.status,
    })
    .where(eq(invoices.id, args.invoiceId))
}

// Back-channel helper reused by the server action (where we do have a Clerk
// session). Kept here so the caller can decide which path stamps sentAt.
export async function sendInvoiceEmailAsUser(args: {
  invoiceId: string
}): Promise<void> {
  await markInvoiceSent(args.invoiceId)
  const ctx = await fetchInvoiceContext(args.invoiceId)
  if (!ctx) return
  await dispatch(ctx, "issued")
}

export async function sendReceiptEmail(args: {
  invoiceId: string
}): Promise<void> {
  const ctx = await fetchInvoiceContext(args.invoiceId)
  if (!ctx) return
  await dispatch(ctx, "receipt")
  if (ctx.client?.id) {
    await sendNotification({
      userId: ctx.client.id,
      userType: "client",
      type: "invoice_paid",
      title: `Receipt: Invoice ${ctx.invoice.invoiceNumber}`,
      body: "Thanks — your payment has been recorded.",
      link: `/portal/invoices/${ctx.invoice.id}`,
    }).catch(() => {})
  }
}

export async function sendReminderEmail(args: {
  invoiceId: string
  tier: "friendly" | "firm" | "final"
  daysOverdue: number
}): Promise<{ sent: boolean }> {
  const ctx = await fetchInvoiceContext(args.invoiceId)
  if (!ctx) return { sent: false }
  const kindByTier: Record<typeof args.tier, InvoiceEmailKind> = {
    friendly: "reminder_friendly",
    firm: "reminder_firm",
    final: "reminder_final",
  }
  const result = await dispatch(ctx, kindByTier[args.tier], {
    daysOverdue: args.daysOverdue,
  })
  if (result.sent && ctx.client?.id) {
    await sendNotification({
      userId: ctx.client.id,
      userType: "client",
      type: "invoice_reminder",
      title: `Reminder: Invoice ${ctx.invoice.invoiceNumber}`,
      body: `Due ${args.daysOverdue} day${args.daysOverdue === 1 ? "" : "s"} ago.`,
      link: `/portal/invoices/${ctx.invoice.id}`,
    }).catch(() => {})
  }
  return result
}
