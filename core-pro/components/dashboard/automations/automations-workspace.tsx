"use client"

import { Play, Plus, Sparkles, Trash2, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  deleteAutomationAction,
  runAutomationNowAction,
  toggleAutomationAction,
} from "@/lib/actions/automations"
import {
  AUTOMATION_TEMPLATES,
  type AutomationTemplate,
} from "@/lib/automations/templates"
import type {
  AutomationAction,
  TriggerConfig,
  TriggerType,
} from "@/lib/automations/types"

import { AutomationBuilder } from "./automation-builder"
import { AutomationPipeline } from "./pipeline"
import {
  TRIGGER_LABELS,
  type AutomationListItem,
  type AutomationLogItem,
  type ReferenceData,
} from "./shared"

type SampleTarget = { id: string; fullName: string; email: string | null }

type WorkspaceProps = {
  automations: AutomationListItem[]
  recentLogs: AutomationLogItem[]
  tags: ReferenceData["tags"]
  forms: ReferenceData["forms"]
  stages: ReferenceData["stages"]
  sampleLeads?: SampleTarget[]
  sampleClients?: SampleTarget[]
  emptyState?: React.ReactNode
}

export function AutomationsWorkspace({
  automations,
  recentLogs,
  tags,
  forms,
  stages,
  sampleLeads = [],
  sampleClients = [],
  emptyState,
}: WorkspaceProps) {
  const router = useRouter()
  const lookup: ReferenceData = { tags, forms, stages }

  const [createOpen, setCreateOpen] = useState(false)
  const [preset, setPreset] = useState<AutomationTemplate | null>(null)
  const [editing, setEditing] = useState<AutomationListItem | null>(null)

  const toggle = useAction(toggleAutomationAction, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't toggle automation.")
    },
  })

  const del = useAction(deleteAutomationAction, {
    onSuccess: () => {
      toast.success("Automation deleted.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete automation.")
    },
  })

  const runNow = useAction(runAutomationNowAction, {
    onSuccess: () => {
      toast.success("Automation ran — see logs for details.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't run automation.")
    },
  })

  const logsByAutomation = useMemo(() => {
    const map = new Map<string, AutomationLogItem[]>()
    for (const log of recentLogs) {
      const list = map.get(log.automationId) ?? []
      list.push(log)
      map.set(log.automationId, list)
    }
    return map
  }, [recentLogs])

  const openCreate = (template?: AutomationTemplate) => {
    setPreset(template ?? null)
    setCreateOpen(true)
  }

  return (
    <Tabs defaultValue="automations" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Recent runs</TabsTrigger>
        </TabsList>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button onClick={() => openCreate()}>
                <Plus className="size-4" />
                Create automation
              </Button>
            }
          />
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {preset ? `New — ${preset.name}` : "New automation"}
              </DialogTitle>
              <DialogDescription>
                Pick a trigger, add conditions, and chain the actions that
                should run.
              </DialogDescription>
            </DialogHeader>
            <AutomationBuilder
              lookup={lookup}
              presetTemplate={preset}
              onDone={() => {
                setCreateOpen(false)
                setPreset(null)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <TabsContent value="automations" className="flex flex-col gap-3">
        {automations.length === 0 ? (
          emptyState
        ) : (
          automations.map((a) => {
            const actions = a.actions as AutomationAction[]
            const logs = logsByAutomation.get(a.id) ?? []
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-heading text-base font-semibold">
                          {a.name}
                        </h3>
                        <Badge variant={a.isActive ? "default" : "outline"}>
                          {a.isActive ? "Active" : "Off"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.runs} {a.runs === 1 ? "run" : "runs"}
                        {a.lastRunAt
                          ? ` · last ${new Date(a.lastRunAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={(checked) =>
                          toggle.execute({ id: a.id, isActive: checked })
                        }
                        disabled={toggle.isPending}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <AutomationPipeline
                    triggerType={a.triggerType}
                    actions={actions}
                    lookup={lookup}
                  />
                  {logs.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {logs.map((log) => (
                        <LogPill key={log.id} log={log} />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditing({
                          ...a,
                          triggerType: a.triggerType,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <RunNowPicker
                      triggerType={a.triggerType as TriggerType}
                      sampleLeads={sampleLeads}
                      sampleClients={sampleClients}
                      pending={runNow.isPending}
                      onRun={(targetId) =>
                        runNow.execute({ id: a.id, targetId })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${a.name}"?`)) {
                          del.execute({ id: a.id })
                        }
                      }}
                      disabled={del.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </TabsContent>

      <TabsContent value="templates" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {AUTOMATION_TEMPLATES.map((t) => (
          <Card key={t.key} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
                    <Sparkles className="size-4 text-primary" />
                    {t.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t.description}
                  </p>
                </div>
                <Badge variant="outline">{TRIGGER_LABELS[t.triggerType]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <AutomationPipeline
                triggerType={t.triggerType}
                actions={t.actions}
                lookup={lookup}
                compact
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreate(t)}
              >
                <Zap className="size-3.5" />
                Use template
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="logs" className="flex flex-col gap-2">
        {recentLogs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No runs yet. Activate an automation and fire its trigger (e.g. add
            a lead) to see logs land here.
          </p>
        ) : (
          recentLogs.map((log) => {
            const parent = automations.find((a) => a.id === log.automationId)
            return (
              <Card key={log.id} size="sm">
                <CardContent className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {parent?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.executedAt).toLocaleString()}
                    </p>
                  </div>
                  <LogPill log={log} />
                  {log.error && (
                    <span className="truncate text-xs text-destructive">
                      {log.error}
                    </span>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </TabsContent>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit automation</DialogTitle>
            <DialogDescription>
              Changes save immediately — active automations pick up the new
              chain on the next trigger fire.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <AutomationBuilder
              lookup={lookup}
              initial={{
                id: editing.id,
                name: editing.name,
                triggerType: editing.triggerType as TriggerType,
                triggerConfig: (editing.triggerConfig ?? {}) as TriggerConfig,
                actions: (editing.actions ?? []) as AutomationAction[],
                isActive: editing.isActive,
              }}
              onDone={() => {
                setEditing(null)
                router.refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

function RunNowPicker({
  triggerType,
  sampleLeads,
  sampleClients,
  pending,
  onRun,
}: {
  triggerType: TriggerType
  sampleLeads: SampleTarget[]
  sampleClients: SampleTarget[]
  pending: boolean
  onRun: (targetId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const targetsLead = triggerType === "new_lead"
  const candidates = targetsLead ? sampleLeads : sampleClients
  const targetLabel = targetsLead ? "lead" : "client"

  const choose = (id: string | null) => {
    setOpen(false)
    onRun(id)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="outline" disabled={pending}>
            <Play className="size-3.5" />
            Run now
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Run with sample target</p>
          <p className="text-xs text-muted-foreground">
            Pick a {targetLabel} so target-dependent steps (email, tag, form)
            actually fire.
          </p>
        </div>
        <div className="flex max-h-72 flex-col overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => choose(null)}
            className="flex flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <span className="font-medium">No target</span>
            <span className="text-xs text-muted-foreground">
              Only notification / reminder steps will run.
            </span>
          </button>
          {candidates.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No recent {targetLabel}s to pick from.
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => choose(c.id)}
                className="flex flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate font-medium">{c.fullName}</span>
                {c.email && (
                  <span className="truncate text-xs text-muted-foreground">
                    {c.email}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function LogPill({ log }: { log: AutomationLogItem }) {
  const tone =
    log.status === "completed"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
      : log.status === "failed"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : log.status === "running"
      ? "bg-primary/10 text-primary border-primary/30"
      : "bg-muted text-muted-foreground border-border"
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tone}`}
      title={log.error ?? undefined}
    >
      {log.status ?? "pending"}
    </span>
  )
}
