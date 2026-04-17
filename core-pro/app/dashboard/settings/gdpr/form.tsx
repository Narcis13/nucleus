"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import Link from "next/link"
import type { Route } from "next"
import { Download, FileText, Shield, Trash2 } from "lucide-react"

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
import { updateGdprSettingsAction } from "@/lib/actions/settings"
import type { GdprSettings } from "@/types/domain"

type ClientRef = { id: string; name: string; email: string }

export function GdprSettingsForm({
  initial,
  clients,
}: {
  initial: GdprSettings
  clients: ClientRef[]
}) {
  const [form, setForm] = useState<GdprSettings>({
    retention_days: initial.retention_days ?? 730,
    auto_delete_inactive: initial.auto_delete_inactive ?? false,
    dpo_email: initial.dpo_email ?? null,
    privacy_policy_url: initial.privacy_policy_url ?? null,
  })
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "")
  const [deleting, setDeleting] = useState<string | null>(null)

  const { execute: save, isExecuting: saving } = useAction(
    updateGdprSettingsAction,
    {
      onSuccess() {
        toast.success("GDPR settings saved")
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Couldn't save")
      },
    },
  )

  async function deleteClient(id: string) {
    const target = clients.find((c) => c.id === id)
    if (!target) return
    const confirmation = window.prompt(
      `Type DELETE to permanently remove ${target.name} and all their data.`,
    )
    if (confirmation !== "DELETE") {
      toast.info("Cancelled")
      return
    }
    setDeleting(id)
    try {
      const res = await fetch(`/api/gdpr/delete/${id}`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Delete failed")
      }
      toast.success("Client data deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Privacy configuration
          </CardTitle>
          <CardDescription>
            Published to your clients&apos; portal footer and used by the
            automation engine when enforcing retention.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="retention">Retention (days)</Label>
            <Input
              id="retention"
              type="number"
              min={30}
              max={3650}
              value={form.retention_days ?? 730}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  retention_days: Number(e.target.value || 0),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              How long we keep inactive client data. Default 2 years.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dpo">Data protection officer email</Label>
            <Input
              id="dpo"
              type="email"
              value={form.dpo_email ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, dpo_email: e.target.value || null }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="policy">Privacy policy URL</Label>
            <Input
              id="policy"
              type="url"
              placeholder="https://…/privacy"
              value={form.privacy_policy_url ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  privacy_policy_url: e.target.value || null,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Need a starting point? See the{" "}
              <Link
                href={"/legal/privacy-policy-template" as Route}
                className="underline"
              >
                privacy policy template
              </Link>
              .
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">
                Auto-delete inactive clients
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Purge clients who haven&apos;t booked or messaged for longer
                than your retention window.
              </p>
            </div>
            <Switch
              checked={form.auto_delete_inactive ?? false}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, auto_delete_inactive: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() =>
            save({
              retention_days: form.retention_days,
              auto_delete_inactive: form.auto_delete_inactive,
              dpo_email: form.dpo_email,
              privacy_policy_url: form.privacy_policy_url,
            })
          }
          disabled={saving}
        >
          {saving ? "Saving…" : "Save GDPR settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-4" />
            Client data export
          </CardTitle>
          <CardDescription>
            Download everything we store about a client as JSON — covers
            profile, appointments, documents, forms, invoices, messages, and
            consents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients yet. Invite one first, then export their data here.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-8 flex-1 rounded-md border border-input bg-background px-2.5 text-sm"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  render={
                    <a
                      href={clientId ? `/api/gdpr/export/${clientId}` : "#"}
                      download
                    />
                  }
                >
                  <FileText className="size-3.5" />
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  render={
                    <a
                      href={
                        clientId
                          ? `/api/gdpr/export/${clientId}?format=csv`
                          : "#"
                      }
                      download
                    />
                  }
                >
                  <FileText className="size-3.5" />
                  Download CSV
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Exports are generated on-demand and not cached — the file you
                download reflects the current database snapshot.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" />
            Delete client data
          </CardTitle>
          <CardDescription>
            Cascading delete — removes the client row, appointments, documents,
            messages, invoices, and revokes their Clerk access. Cannot be
            undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients to delete.
            </p>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.email}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteClient(c.id)}
                  disabled={deleting === c.id}
                >
                  {deleting === c.id ? "Deleting…" : "Delete data"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
