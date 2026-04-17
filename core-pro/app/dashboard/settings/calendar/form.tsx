"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { CalendarClock, Copy } from "lucide-react"

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
import { updateCalendarSyncAction } from "@/lib/actions/settings"

type Initial = {
  timezone: string
  google_calendar_sync_url: string | null
  ical_subscription_enabled: boolean
}

export function CalendarForm({
  initial,
  icalUrl,
}: {
  initial: Initial
  icalUrl: string
}) {
  const [form, setForm] = useState(initial)

  const { execute: save, isExecuting } = useAction(updateCalendarSyncAction, {
    onSuccess() {
      toast.success("Calendar settings saved")
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't save")
    },
  })

  async function copyIcal() {
    try {
      await navigator.clipboard.writeText(icalUrl)
      toast.success("Subscription URL copied")
    } catch {
      toast.error("Copy failed — select and copy manually")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            iCal subscription
          </CardTitle>
          <CardDescription>
            Subscribe from Google Calendar, Apple Calendar, or Outlook to see
            your appointments directly in your calendar of choice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ical-url">Subscription URL</Label>
            <div className="flex gap-2">
              <Input id="ical-url" value={icalUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={copyIcal}>
                <Copy className="size-3.5" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this URL private — anyone with it can read your next 90 days
              of appointments.
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">Enable subscription feed</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Turn off to invalidate existing subscriptions (they&apos;ll
                stop receiving updates).
              </p>
            </div>
            <Switch
              checked={form.ical_subscription_enabled}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, ical_subscription_enabled: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar sync</CardTitle>
          <CardDescription>
            Paste your private Google Calendar URL to overlay your personal
            events on the availability picker (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gcal-url">Google Calendar secret address</Label>
            <Input
              id="gcal-url"
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/...basic.ics"
              value={form.google_calendar_sync_url ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  google_calendar_sync_url: e.target.value || null,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              In Google Calendar, open the calendar&apos;s settings, then copy
              the &ldquo;Secret address in iCal format&rdquo;. We never write
              back.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>
            Used for appointment reminders, iCal events, and quiet hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="timezone">IANA timezone</Label>
            <Input
              id="timezone"
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => ({ ...f, timezone: e.target.value }))
              }
              placeholder="Europe/Bucharest"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() =>
            save({
              timezone: form.timezone,
              google_calendar_sync_url: form.google_calendar_sync_url,
              ical_subscription_enabled: form.ical_subscription_enabled,
            })
          }
          disabled={isExecuting}
        >
          {isExecuting ? "Saving…" : "Save calendar settings"}
        </Button>
      </div>
    </div>
  )
}
