"use client"

import { Plus, Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createAutomationAction,
  updateAutomationAction,
} from "@/lib/actions/automations"
import {
  AUTOMATION_TEMPLATES,
  type AutomationTemplate,
} from "@/lib/automations/templates"
import { TRIGGER_TYPES } from "@/lib/automations/types"
import type {
  AutomationAction,
  TriggerConfig,
  TriggerType,
} from "@/lib/automations/types"
import { CAMPAIGN_TEMPLATES } from "@/lib/marketing/templates"

import { AutomationPipeline } from "./pipeline"
import {
  ACTION_LABELS,
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
  type ReferenceData,
} from "./shared"

// ─────────────────────────────────────────────────────────────────────────────
// <AutomationBuilder>
//
// Three-step builder:
//   1. Pick trigger (+ optional inactivity / schedule config)
//   2. Optional conditions (tag filter, client status)
//   3. Action chain — add, edit, reorder, delete per row
//
// A live "trigger → action → wait → action" pipeline sits on top so the pro
// sees what they're authoring at a glance. Saves via server actions; toast +
// router.refresh() handled by the parent workspace through `onDone`.
// ─────────────────────────────────────────────────────────────────────────────

type InitialState = {
  id: string
  name: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  actions: AutomationAction[]
  isActive: boolean
}

type BuilderProps = {
  lookup: ReferenceData
  initial?: InitialState
  presetTemplate?: AutomationTemplate | null
  onDone: () => void
}

type BuilderState = {
  name: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  actions: AutomationAction[]
}

export function AutomationBuilder({
  lookup,
  initial,
  presetTemplate,
  onDone,
}: BuilderProps) {
  const [state, setState] = useState<BuilderState>(() => {
    if (initial) {
      return {
        name: initial.name,
        triggerType: initial.triggerType,
        triggerConfig: initial.triggerConfig,
        actions: initial.actions,
      }
    }
    if (presetTemplate) {
      return {
        name: presetTemplate.name,
        triggerType: presetTemplate.triggerType,
        triggerConfig: presetTemplate.triggerConfig,
        actions: presetTemplate.actions,
      }
    }
    return {
      name: "",
      triggerType: "new_lead",
      triggerConfig: {},
      actions: [],
    }
  })

  const createAction = useAction(createAutomationAction, {
    onSuccess: () => {
      toast.success("Automation saved.")
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save automation.")
    },
  })

  const updateActionMut = useAction(updateAutomationAction, {
    onSuccess: () => {
      toast.success("Automation updated.")
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update automation.")
    },
  })

  const pending = createAction.isPending || updateActionMut.isPending

  const handleSave = () => {
    const trimmed = state.name.trim()
    if (!trimmed) {
      toast.error("Give your automation a name.")
      return
    }
    if (state.actions.length === 0) {
      toast.error("Add at least one action.")
      return
    }
    if (initial) {
      updateActionMut.execute({
        id: initial.id,
        name: trimmed,
        triggerType: state.triggerType,
        triggerConfig: state.triggerConfig,
        actions: state.actions,
      })
    } else {
      createAction.execute({
        name: trimmed,
        triggerType: state.triggerType,
        triggerConfig: state.triggerConfig,
        actions: state.actions,
        isActive: true,
      })
    }
  }

  const triggerNeedsInactiveDays = state.triggerType === "client_inactive"
  const triggerNeedsSchedule = state.triggerType === "custom_date"
  const triggerNeedsForm = state.triggerType === "form_submitted"

  return (
    <div className="flex flex-col gap-5">
      {/* Pipeline preview */}
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <AutomationPipeline
          triggerType={state.triggerType}
          actions={state.actions}
          lookup={lookup}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="automation-name">Name</Label>
        <Input
          id="automation-name"
          placeholder="e.g. Welcome new clients"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
        />
      </div>

      {/* Step 1 — trigger */}
      <StepCard
        step={1}
        title="Select trigger"
        description="Pick the event that starts this automation."
      >
        <Select
          value={state.triggerType}
          onValueChange={(v) =>
            setState((s) => ({
              ...s,
              triggerType: v as TriggerType,
              // Keep conditions but reset trigger-specific knobs when switching
              triggerConfig: { conditions: s.triggerConfig.conditions },
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: TriggerType) => TRIGGER_LABELS[v]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          {TRIGGER_DESCRIPTIONS[state.triggerType]}
        </p>
        {triggerNeedsInactiveDays && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="inactive-days">Days without activity</Label>
            <Input
              id="inactive-days"
              type="number"
              min={1}
              max={365}
              value={state.triggerConfig.inactiveDays ?? 30}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  triggerConfig: {
                    ...s.triggerConfig,
                    inactiveDays: Number(e.target.value) || 30,
                  },
                }))
              }
            />
          </div>
        )}
        {triggerNeedsSchedule && (
          <div className="flex flex-col gap-1">
            <Label>Schedule</Label>
            <Select
              value={state.triggerConfig.schedule ?? "weekly"}
              onValueChange={(v) =>
                setState((s) => ({
                  ...s,
                  triggerConfig: {
                    ...s.triggerConfig,
                    schedule: v as "daily" | "weekly" | "monthly",
                  },
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: "daily" | "weekly" | "monthly") =>
                    v === "daily" ? "Daily" : v === "monthly" ? "Monthly" : "Weekly"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {triggerNeedsForm && (
          <div className="flex flex-col gap-1">
            <Label>Specific form (optional)</Label>
            <Select
              value={state.triggerConfig.conditions?.formId ?? "__any__"}
              onValueChange={(v) =>
                setState((s) => ({
                  ...s,
                  triggerConfig: {
                    ...s.triggerConfig,
                    conditions: {
                      ...(s.triggerConfig.conditions ?? {}),
                      formId: v === "__any__" ? null : v,
                    },
                  },
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) =>
                    v === "__any__"
                      ? "Any form"
                      : (lookup.forms.find((f) => f.id === v)?.title ?? "Any form")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any form</SelectItem>
                {lookup.forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </StepCard>

      {/* Step 2 — conditions */}
      <StepCard
        step={2}
        title="Add conditions"
        description="Optional — filter which targets actually run the chain."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Tag filter</Label>
            <Select
              value={state.triggerConfig.conditions?.tagIds?.[0] ?? "__any__"}
              onValueChange={(v) => {
                const value = v ?? "__any__"
                setState((s) => ({
                  ...s,
                  triggerConfig: {
                    ...s.triggerConfig,
                    conditions: {
                      ...(s.triggerConfig.conditions ?? {}),
                      tagIds: value === "__any__" ? undefined : [value],
                    },
                  },
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any">
                  {(v: string) =>
                    v === "__any__"
                      ? "Any tag"
                      : (lookup.tags.find((t) => t.id === v)?.name ?? "Any tag")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any tag</SelectItem>
                {lookup.tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Client status</Label>
            <Select
              value={state.triggerConfig.conditions?.clientStatus ?? "__any__"}
              onValueChange={(v) =>
                setState((s) => ({
                  ...s,
                  triggerConfig: {
                    ...s.triggerConfig,
                    conditions: {
                      ...(s.triggerConfig.conditions ?? {}),
                      clientStatus: v === "__any__" ? null : v,
                    },
                  },
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any">
                  {(v: string) =>
                    v === "active"
                      ? "Active"
                      : v === "paused"
                        ? "Paused"
                        : v === "archived"
                          ? "Archived"
                          : "Any status"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Plan tier</Label>
            <Select
              value={state.triggerConfig.conditions?.planTier ?? "__any__"}
              onValueChange={(v) =>
                setState((s) => ({
                  ...s,
                  triggerConfig: {
                    ...s.triggerConfig,
                    conditions: {
                      ...(s.triggerConfig.conditions ?? {}),
                      planTier: v === "__any__" ? null : v,
                    },
                  },
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any">
                  {(v: string) =>
                    v === "starter"
                      ? "Starter"
                      : v === "growth"
                        ? "Growth"
                        : v === "pro"
                          ? "Pro"
                          : "Any plan"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any plan</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </StepCard>

      {/* Step 3 — actions */}
      <StepCard
        step={3}
        title="Define actions"
        description="The chain runs top-to-bottom. Insert waits to delay downstream steps."
      >
        <div className="flex flex-col gap-2">
          {state.actions.map((action, idx) => (
            <ActionRow
              key={idx}
              index={idx}
              action={action}
              lookup={lookup}
              onChange={(next) =>
                setState((s) => ({
                  ...s,
                  actions: s.actions.map((a, i) => (i === idx ? next : a)),
                }))
              }
              onRemove={() =>
                setState((s) => ({
                  ...s,
                  actions: s.actions.filter((_, i) => i !== idx),
                }))
              }
            />
          ))}
          <AddActionMenu
            onAdd={(action) =>
              setState((s) => ({ ...s, actions: [...s.actions, action] }))
            }
          />
        </div>
      </StepCard>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Create automation"}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </span>
        <div>
          <h4 className="font-heading text-sm font-medium text-foreground">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 pl-9">{children}</div>
    </div>
  )
}

function ActionRow({
  index,
  action,
  lookup,
  onChange,
  onRemove,
}: {
  index: number
  action: AutomationAction
  lookup: ReferenceData
  onChange: (action: AutomationAction) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Step {index + 1} · {ACTION_LABELS[action.type]}
        </span>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <ActionEditor action={action} lookup={lookup} onChange={onChange} />
    </div>
  )
}

function ActionEditor({
  action,
  lookup,
  onChange,
}: {
  action: AutomationAction
  lookup: ReferenceData
  onChange: (action: AutomationAction) => void
}) {
  switch (action.type) {
    case "send_email":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-end">
          <div className="flex flex-col gap-1">
            <Label>Email template</Label>
            <Select
              value={action.templateKey}
              onValueChange={(v) =>
                onChange({ ...action, templateKey: v ?? action.templateKey })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) =>
                    Object.values(CAMPAIGN_TEMPLATES).find((t) => t.key === v)
                      ?.name ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(CAMPAIGN_TEMPLATES).map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Subject override (optional)</Label>
            <Input
              value={action.subject ?? ""}
              onChange={(e) =>
                onChange({ ...action, subject: e.target.value || null })
              }
            />
          </div>
        </div>
      )
    case "send_notification":
    case "create_task":
      return (
        <div className="grid grid-cols-1 gap-2">
          <div className="flex flex-col gap-1">
            <Label>Title</Label>
            <Input
              value={action.title}
              onChange={(e) => onChange({ ...action, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Body (optional)</Label>
            <Textarea
              rows={2}
              value={action.body ?? ""}
              onChange={(e) =>
                onChange({ ...action, body: e.target.value || null })
              }
            />
          </div>
        </div>
      )
    case "assign_form":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>Form</Label>
            <Select
              value={action.formId || "__none__"}
              onValueChange={(v) => {
                const value = v ?? "__none__"
                onChange({ ...action, formId: value === "__none__" ? "" : value })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a form">
                  {(v: string) =>
                    v === "__none__"
                      ? "—"
                      : (lookup.forms.find((f) => f.id === v)?.title ?? "—")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {lookup.forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Due in (days)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={action.dueDays ?? 7}
              onChange={(e) =>
                onChange({
                  ...action,
                  dueDays: Number(e.target.value) || null,
                })
              }
            />
          </div>
        </div>
      )
    case "add_tag":
    case "remove_tag":
      return (
        <div className="flex flex-col gap-1">
          <Label>Tag</Label>
          <Select
            value={action.tagId || "__none__"}
            onValueChange={(v) => {
              const value = v ?? "__none__"
              onChange({ ...action, tagId: value === "__none__" ? "" : value })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a tag">
                {(v: string) =>
                  v === "__none__"
                    ? "—"
                    : (lookup.tags.find((t) => t.id === v)?.name ?? "—")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {lookup.tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case "move_lead_to_stage":
      return (
        <div className="flex flex-col gap-1">
          <Label>Stage</Label>
          <Select
            value={action.stageId || "__none__"}
            onValueChange={(v) => {
              const value = v ?? "__none__"
              onChange({ ...action, stageId: value === "__none__" ? "" : value })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a stage">
                {(v: string) =>
                  v === "__none__"
                    ? "—"
                    : (lookup.stages.find((s) => s.id === v)?.name ?? "—")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {lookup.stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case "wait":
      return (
        <div className="flex flex-col gap-1">
          <Label>Days to wait</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={action.days}
            onChange={(e) =>
              onChange({ ...action, days: Number(e.target.value) || 1 })
            }
          />
        </div>
      )
  }
}

function AddActionMenu({
  onAdd,
}: {
  onAdd: (action: AutomationAction) => void
}) {
  const options: Array<{
    type: AutomationAction["type"]
    label: string
    factory: () => AutomationAction
  }> = useMemo(
    () => [
      {
        type: "send_email",
        label: ACTION_LABELS.send_email,
        factory: () => ({
          type: "send_email",
          templateKey: "welcome",
          subject: null,
        }),
      },
      {
        type: "send_notification",
        label: ACTION_LABELS.send_notification,
        factory: () => ({
          type: "send_notification",
          title: "New automation notice",
          body: null,
        }),
      },
      {
        type: "assign_form",
        label: ACTION_LABELS.assign_form,
        factory: () => ({ type: "assign_form", formId: "", dueDays: 7 }),
      },
      {
        type: "add_tag",
        label: ACTION_LABELS.add_tag,
        factory: () => ({ type: "add_tag", tagId: "" }),
      },
      {
        type: "remove_tag",
        label: ACTION_LABELS.remove_tag,
        factory: () => ({ type: "remove_tag", tagId: "" }),
      },
      {
        type: "move_lead_to_stage",
        label: ACTION_LABELS.move_lead_to_stage,
        factory: () => ({ type: "move_lead_to_stage", stageId: "" }),
      },
      {
        type: "create_task",
        label: ACTION_LABELS.create_task,
        factory: () => ({
          type: "create_task",
          title: "Follow up",
          body: null,
        }),
      },
      {
        type: "wait",
        label: ACTION_LABELS.wait,
        factory: () => ({ type: "wait", days: 3 }),
      },
    ],
    [],
  )

  const [picker, setPicker] = useState<string>("")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={picker}
        onValueChange={(v) => {
          const opt = options.find((o) => o.type === v)
          if (opt) onAdd(opt.factory())
          setPicker("")
        }}
      >
        <SelectTrigger className="w-full sm:w-64">
          <Plus className="size-3.5" />
          <SelectValue placeholder="Add action" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.type} value={o.type}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        Actions append to the end of the chain.
      </span>
    </div>
  )
}

// Re-export the template list so callers can offer "Start from template".
export const BUILDER_TEMPLATES = AUTOMATION_TEMPLATES
