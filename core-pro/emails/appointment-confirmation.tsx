import AppointmentReminderEmail, {
  type AppointmentEmailProps,
} from "./appointment-reminder"

// Convenience wrapper around the multi-kind appointment template — the
// "confirmation" email is sent often enough that a dedicated entry point in the
// template registry keeps the call sites readable.

export type AppointmentConfirmationEmailProps = Omit<
  AppointmentEmailProps,
  "kind"
>

export default function AppointmentConfirmationEmail(
  props: AppointmentConfirmationEmailProps,
) {
  return AppointmentReminderEmail({ ...props, kind: "confirmation" })
}
