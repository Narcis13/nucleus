import "server-only"

import { render } from "@react-email/components"
import { eq } from "drizzle-orm"

import { dbAdmin } from "@/lib/db/client"
import { env } from "@/lib/env"
import { fromAddress, getResend } from "@/lib/resend/client"
import {
  appointments,
  clients,
  professionals,
  services,
} from "@/lib/db/schema"
import AppointmentReminderEmail, {
  type AppointmentEmailKind,
} from "@/emails/appointment-reminder"

import { appointmentToInvite } from "./ical"

// ─────────────────────────────────────────────────────────────────────────────
// Sends appointment-related emails to both sides of the booking. Pulls the
// joined row directly via dbAdmin (we may be running in a Trigger.dev task or
// from a public booking action where there's no Clerk session).
//
// Best-effort: if Resend is not configured we no-op so local dev doesn't fail.
// ─────────────────────────────────────────────────────────────────────────────

type SendArgs = {
  appointmentId: string
  kind: AppointmentEmailKind
}

export async function sendAppointmentEmails(args: SendArgs): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const ctx = await fetchAppointmentContext(args.appointmentId)
  if (!ctx) return

  const { appointment, professional, client, guestName, guestEmail } = ctx

  const proRecipient = professional.email
  const clientRecipient = client?.email ?? guestEmail
  const clientLabel = client?.fullName ?? guestName ?? "Guest"
  const subject = subjectFor(args.kind, appointment.title)

  // Generate a single .ics invite — only attached on confirmation. Reminder
  // emails skip the attachment because most calendars already have the event.
  const includeIcs = args.kind === "confirmation"
  const ics = includeIcs
    ? appointmentToInvite(
        appointment,
        professional.email,
        professional.fullName,
      )
    : null
  const attachments = ics?.value && !ics.error
    ? [
        {
          filename: "invite.ics",
          content: Buffer.from(ics.value, "utf-8").toString("base64"),
          contentType: "text/calendar; method=REQUEST",
        },
      ]
    : undefined

  const baseProps = {
    professionalName: professional.fullName,
    clientName: clientLabel,
    title: appointment.title,
    startAtIso: new Date(appointment.startAt).toISOString(),
    endAtIso: new Date(appointment.endAt).toISOString(),
    location: appointment.location,
    notes: appointment.notes,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    kind: args.kind,
  }

  const proHtml = await render(
    AppointmentReminderEmail({
      ...baseProps,
      recipientName: professional.fullName,
      recipientRole: "professional",
    }),
  )
  const clientHtml = await render(
    AppointmentReminderEmail({
      ...baseProps,
      recipientName: clientLabel,
      recipientRole: "client",
    }),
  )

  const tasks: Promise<unknown>[] = []
  tasks.push(
    resend.emails.send({
      from: fromAddress(),
      to: proRecipient,
      subject,
      html: proHtml,
      attachments,
    }),
  )
  if (clientRecipient) {
    tasks.push(
      resend.emails.send({
        from: fromAddress(),
        to: clientRecipient,
        subject,
        html: clientHtml,
        attachments,
      }),
    )
  }
  await Promise.allSettled(tasks)
}

// Schedules 24h + 1h reminder emails via Trigger.dev. If Trigger isn't
// configured, this becomes a no-op — the dashboard still works without
// background jobs (reminders just won't fire).
export async function scheduleAppointmentReminders(
  appointmentId: string,
): Promise<void> {
  if (!env.TRIGGER_SECRET_KEY) return
  // Late import — `@trigger.dev/sdk` pulls in node-only deps and we don't
  // want to load it on every request just to check the key.
  const { tasks } = await import("@trigger.dev/sdk")
  const ctx = await fetchAppointmentContext(appointmentId)
  if (!ctx) return

  const start = new Date(ctx.appointment.startAt).getTime()
  const now = Date.now()
  const at24h = start - 24 * 60 * 60 * 1000
  const at1h = start - 60 * 60 * 1000

  const sends: Array<Promise<unknown>> = []
  if (at24h > now) {
    sends.push(
      tasks.trigger(
        "appointments.send-reminder",
        { appointmentId, kind: "reminder_24h" },
        { delay: new Date(at24h) },
      ),
    )
  }
  if (at1h > now) {
    sends.push(
      tasks.trigger(
        "appointments.send-reminder",
        { appointmentId, kind: "reminder_1h" },
        { delay: new Date(at1h) },
      ),
    )
  }
  await Promise.allSettled(sends)
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function subjectFor(kind: AppointmentEmailKind, title: string): string {
  const prefix = {
    confirmation: "Confirmed",
    reminder_24h: "Reminder",
    reminder_1h: "Starting soon",
    cancellation: "Cancelled",
  }[kind]
  return `[${prefix}] ${title}`
}

type AppointmentContext = {
  appointment: typeof appointments.$inferSelect
  professional: { id: string; fullName: string; email: string }
  client: { id: string; fullName: string; email: string } | null
  service: { id: string; name: string; durationMinutes: number | null } | null
  guestName: string | null
  guestEmail: string | null
}

async function fetchAppointmentContext(
  appointmentId: string,
): Promise<AppointmentContext | null> {
  const rows = await dbAdmin
    .select({
      appointment: appointments,
      professional: {
        id: professionals.id,
        fullName: professionals.fullName,
        email: professionals.email,
      },
      client: {
        id: clients.id,
        fullName: clients.fullName,
        email: clients.email,
      },
      service: {
        id: services.id,
        name: services.name,
        durationMinutes: services.durationMinutes,
      },
    })
    .from(appointments)
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .leftJoin(clients, eq(clients.id, appointments.clientId))
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .where(eq(appointments.id, appointmentId))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const meta = (row.appointment.metadata ?? null) as
    | { guest_name?: string; guest_email?: string }
    | null
  return {
    appointment: row.appointment,
    professional: row.professional,
    client: row.client?.id ? row.client : null,
    service: row.service?.id ? row.service : null,
    guestName: meta?.guest_name ?? null,
    guestEmail: meta?.guest_email ?? null,
  }
}
