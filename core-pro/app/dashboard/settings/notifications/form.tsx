"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { Bell, BellOff, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { usePushSubscription } from "@/hooks/use-push-subscription"
import {
  sendTestNotificationAction,
  updateNotificationPreferencesAction,
} from "@/lib/actions/notifications"
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// NotificationPreferencesForm
//
// Client form with three groups:
//   • Types — which events generate a notification at all.
//   • Channels — how those notifications are delivered (in-app / email / push).
//   • Quiet hours — time range during which email + push are suppressed (the
//     in-app record still lands so unread counts stay accurate).
//
// Also exposes browser push enablement via usePushSubscription and a "send
// test" button so users can verify delivery without running an actual flow.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_COPY: Record<NotificationType, { title: string; hint: string }> = {
  message: { title: "Messages", hint: "New replies from clients." },
  appointment: {
    title: "Appointments",
    hint: "Confirmations, reminders, and cancellations.",
  },
  form: { title: "Forms", hint: "Responses from clients on assigned forms." },
  lead: { title: "Leads", hint: "New inquiries from your site or widgets." },
  invoice: {
    title: "Invoices",
    hint: "Payments, overdues, and reminders you send.",
  },
  document: {
    title: "Documents",
    hint: "Uploads by clients to their document vault.",
  },
  system: {
    title: "System",
    hint: "Billing changes, plan events, service status.",
  },
}

const CHANNEL_COPY: Record<
  NotificationChannel,
  { title: string; hint: string }
> = {
  in_app: {
    title: "In-app",
    hint: "Shows up in your bell and /notifications.",
  },
  email: {
    title: "Email",
    hint: "Delivered to your sign-up address via Resend.",
  },
  push: {
    title: "Browser push",
    hint: "Notifications even when the tab is closed.",
  },
}

export function NotificationPreferencesForm({
  initial,
}: {
  initial: NotificationPreferences
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial)
  const push = usePushSubscription()

  const { execute: save, isExecuting: isSaving } = useAction(
    updateNotificationPreferencesAction,
    {
      onSuccess({ data }) {
        if (data?.preferences) setPrefs(data.preferences)
        toast.success("Preferences saved")
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Couldn't save preferences")
      },
    },
  )

  const { execute: test, isExecuting: isTesting } = useAction(
    sendTestNotificationAction,
    {
      onSuccess({ data }) {
        const channels = [
          data?.in_app ? "in-app" : null,
          data?.email ? "email" : null,
          data?.push && data.push.delivered > 0 ? "push" : null,
        ].filter(Boolean)
        toast.success(
          channels.length > 0
            ? `Test sent via ${channels.join(", ")}.`
            : "Test queued — nothing delivered (check preferences & push setup).",
        )
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Couldn't send test")
      },
    },
  )

  const setType = (type: NotificationType, enabled: boolean) =>
    setPrefs((p) => ({
      ...p,
      per_type: { ...(p.per_type ?? {}), [type]: enabled },
    }))

  const setChannel = (channel: NotificationChannel, enabled: boolean) =>
    setPrefs((p) => ({
      ...p,
      per_channel: { ...(p.per_channel ?? {}), [channel]: enabled },
    }))

  const setQuiet = (patch: Partial<NonNullable<NotificationPreferences["quiet_hours"]>>) =>
    setPrefs((p) => ({
      ...p,
      quiet_hours: {
        enabled: p.quiet_hours?.enabled ?? false,
        start: p.quiet_hours?.start ?? "22:00",
        end: p.quiet_hours?.end ?? "07:00",
        ...patch,
      },
    }))

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Event types</CardTitle>
          <CardDescription>
            Turn off the categories you don&apos;t want to hear about.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(TYPE_COPY) as NotificationType[]).map((t) => {
            const enabled = prefs.per_type?.[t] !== false
            return (
              <ToggleRow
                key={t}
                title={TYPE_COPY[t].title}
                hint={TYPE_COPY[t].hint}
                checked={enabled}
                onChange={(v) => setType(t, v)}
              />
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery channels</CardTitle>
          <CardDescription>
            How we reach you. In-app is always recorded to keep unread counts
            accurate, even when the channel is off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(Object.keys(CHANNEL_COPY) as NotificationChannel[]).map(
            (channel) => {
              const enabled = prefs.per_channel?.[channel] !== false
              return (
                <ToggleRow
                  key={channel}
                  title={CHANNEL_COPY[channel].title}
                  hint={CHANNEL_COPY[channel].hint}
                  checked={enabled}
                  onChange={(v) => setChannel(channel, v)}
                />
              )
            },
          )}

          <PushRow push={push} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet hours</CardTitle>
          <CardDescription>
            Pause email + push during a daily window. In-app notifications still
            land.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleRow
            title={
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4" />
                Enable quiet hours
              </span>
            }
            hint="Windows that cross midnight are supported (e.g. 22:00 → 07:00)."
            checked={prefs.quiet_hours?.enabled ?? false}
            onChange={(v) => setQuiet({ enabled: v })}
          />
          <div className="grid max-w-sm grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiet-start">Start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={prefs.quiet_hours?.start ?? "22:00"}
                onChange={(e) => setQuiet({ start: e.target.value })}
                disabled={!prefs.quiet_hours?.enabled}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiet-end">End</Label>
              <Input
                id="quiet-end"
                type="time"
                value={prefs.quiet_hours?.end ?? "07:00"}
                onChange={(e) => setQuiet({ end: e.target.value })}
                disabled={!prefs.quiet_hours?.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => test({})}
          disabled={isTesting}
        >
          {isTesting ? "Sending…" : "Send test notification"}
        </Button>
        <Button onClick={() => save(prefs)} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  )
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: React.ReactNode
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function PushRow({ push }: { push: ReturnType<typeof usePushSubscription> }) {
  const { state, error, subscribe, unsubscribe } = push

  if (state === "unsupported") {
    return (
      <Hint icon={<BellOff className="size-4" />}>
        This browser doesn&apos;t support Web Push.
      </Hint>
    )
  }
  if (state === "unavailable") {
    return (
      <Hint icon={<BellOff className="size-4" />}>
        Browser push is not configured on the server. Set <code>VAPID_PUBLIC_KEY</code>{" "}
        and <code>VAPID_PRIVATE_KEY</code> to enable delivery.
      </Hint>
    )
  }
  if (state === "denied") {
    return (
      <Hint icon={<BellOff className="size-4" />}>
        You&apos;ve blocked notifications for this site — re-enable them in your
        browser settings to continue.
      </Hint>
    )
  }
  if (state === "loading") {
    return <Hint icon={<Bell className="size-4" />}>Checking browser…</Hint>
  }

  const subscribed = state === "subscribed"
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3">
      <div className="flex min-w-0 items-start gap-2">
        <Bell className="mt-0.5 size-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">
            {subscribed ? "This device is subscribed" : "Enable on this device"}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each browser/device must be enabled separately.
          </p>
          {error && (
            <p className="mt-1 text-xs text-destructive">Error: {error}</p>
          )}
        </div>
      </div>
      {subscribed ? (
        <Button variant="outline" size="sm" onClick={() => void unsubscribe()}>
          Disable
        </Button>
      ) : (
        <Button size="sm" onClick={() => void subscribe()}>
          Enable
        </Button>
      )}
    </div>
  )
}

function Hint({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
      <span className="mt-0.5">{icon}</span>
      <div>{children}</div>
    </div>
  )
}
