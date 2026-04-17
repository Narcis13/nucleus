"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { Video } from "lucide-react"

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
import { updateIntegrationsAction } from "@/lib/actions/settings"
import type { IntegrationsConfig } from "@/types/domain"

type Service = {
  id: "zoom" | "google_meet"
  name: string
  description: string
  accent: string
}

const SERVICES: readonly Service[] = [
  {
    id: "zoom",
    name: "Zoom",
    description: "Add a Zoom meeting link automatically on confirmed appointments.",
    accent: "#2D8CFF",
  },
  {
    id: "google_meet",
    name: "Google Meet",
    description: "Generate a Meet link for every appointment with a virtual service.",
    accent: "#00AC47",
  },
] as const

export function IntegrationsForm({
  initial,
}: {
  initial: IntegrationsConfig
}) {
  const [config, setConfig] = useState<IntegrationsConfig>(initial)
  const { execute: save, isExecuting } = useAction(updateIntegrationsAction, {
    onSuccess() {
      toast.success("Integrations saved")
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Couldn't save")
    },
  })

  function setService(
    id: Service["id"],
    next: { enabled?: boolean; account_email?: string },
  ) {
    setConfig((prev) => ({
      ...prev,
      [id]: {
        enabled: next.enabled ?? prev[id]?.enabled ?? false,
        account_email:
          next.account_email ?? prev[id]?.account_email ?? undefined,
      },
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Video conferencing</CardTitle>
          <CardDescription>
            Automatically attach a meeting link to virtual appointments. You
            still need to connect your account to generate real links — the
            toggle here controls only whether the link slot is rendered on
            confirmations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {SERVICES.map((service) => {
            const state = config[service.id]
            const enabled = state?.enabled ?? false
            return (
              <div
                key={service.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: service.accent }}
                    >
                      <Video className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{service.name}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) =>
                      setService(service.id, { enabled: v })
                    }
                  />
                </div>
                {enabled && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${service.id}-email`}>Account email</Label>
                    <Input
                      id={`${service.id}-email`}
                      type="email"
                      placeholder="you@example.com"
                      value={state?.account_email ?? ""}
                      onChange={(e) =>
                        setService(service.id, {
                          account_email: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Niche integrations</CardTitle>
          <CardDescription>
            Future services specific to your practice (MyFitnessPal for
            nutrition, InBody exports, …) will appear here as they roll out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            None available yet — check back after your niche pack is enabled.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => save(cleanForSave(config))}
          disabled={isExecuting}
        >
          {isExecuting ? "Saving…" : "Save integrations"}
        </Button>
      </div>
    </div>
  )
}

// Strip empty strings before submitting — the server schema uses
// z.string().email() which rejects ""s.
function cleanForSave(
  config: IntegrationsConfig,
): IntegrationsConfig {
  const clean: IntegrationsConfig = {}
  for (const key of ["zoom", "google_meet"] as const) {
    const entry = config[key]
    if (!entry) continue
    clean[key] = {
      enabled: entry.enabled,
      account_email:
        entry.account_email && entry.account_email.trim().length > 0
          ? entry.account_email.trim()
          : undefined,
    }
  }
  return clean
}
