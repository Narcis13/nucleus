"use client"

import {
  ArrowRightCircle,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquarePlus,
  Phone,
  Star,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  addLeadActivityAction,
  convertLeadToClientAction,
  markLeadLostAction,
  moveLeadToStageAction,
  updateLeadAction,
} from "@/lib/actions/leads"
import type { Lead, LeadActivity, LeadStage } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <LeadDetail>
//
// Slide-over panel for a single lead. Shows contact + score + stage selector,
// the activity timeline, and quick actions (add note/log call, convert,
// mark lost). Mutations flow through callbacks the parent <LeadsPipeline>
// passes in, so local state stays the source of truth.
// ─────────────────────────────────────────────────────────────────────────────
export function LeadDetail({
  lead,
  stages,
  activities,
  open,
  onOpenChange,
  onLeadUpdated,
  onActivityCreated,
}: {
  lead: Lead | null
  stages: LeadStage[]
  activities: LeadActivity[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated: (lead: Lead) => void
  onActivityCreated: (activity: LeadActivity) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {lead ? (
          <LeadDetailBody
            key={lead.id}
            lead={lead}
            stages={stages}
            activities={activities}
            onLeadUpdated={onLeadUpdated}
            onActivityCreated={onActivityCreated}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// Keyed inner body — remounts whenever the active lead changes, so we can
// derive form state from props in useState() initializers without an effect.
function LeadDetailBody({
  lead,
  stages,
  activities,
  onLeadUpdated,
  onActivityCreated,
}: {
  lead: Lead
  stages: LeadStage[]
  activities: LeadActivity[]
  onLeadUpdated: (lead: Lead) => void
  onActivityCreated: (activity: LeadActivity) => void
}) {
  const router = useRouter()
  const [score, setScore] = useState(lead.score)
  const [notes, setNotes] = useState(lead.notes ?? "")
  const [activityType, setActivityType] = useState<
    "note" | "call" | "email" | "meeting"
  >("note")
  const [activityText, setActivityText] = useState("")
  const [lostReason, setLostReason] = useState("")
  const [showLostForm, setShowLostForm] = useState(false)

  const updateAction = useAction(updateLeadAction, {
    onSuccess: ({ data }) => {
      toast.success("Lead saved.")
      if (data?.lead) onLeadUpdated(data.lead)
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't save lead."),
  })
  const moveAction = useAction(moveLeadToStageAction, {
    onSuccess: ({ data }) => {
      if (data?.id && data.stageId) {
        onLeadUpdated({ ...lead, id: data.id, stageId: data.stageId })
      }
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't move lead."),
  })
  const addActivityAction = useAction(addLeadActivityAction, {
    onSuccess: ({ data }) => {
      toast.success("Activity logged.")
      setActivityText("")
      if (data?.activity) onActivityCreated(data.activity)
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't log activity."),
  })
  const convertAction = useAction(convertLeadToClientAction, {
    onSuccess: ({ data }) => {
      toast.success("Lead converted to client.")
      if (data?.lead) onLeadUpdated(data.lead)
      if (data?.clientId) {
        router.push(`/dashboard/clients/${data.clientId}`)
      }
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't convert lead."),
  })
  const lostAction = useAction(markLeadLostAction, {
    onSuccess: ({ data }) => {
      toast.success("Marked as lost.")
      setShowLostForm(false)
      setLostReason("")
      if (data?.lead) onLeadUpdated(data.lead)
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't mark lost."),
  })

  const currentStage = stages.find((s) => s.id === lead.stageId)
  const isConverted = Boolean(lead.convertedClientId)
  const isLost = currentStage?.isLost ?? false

  return (
    <>
      <SheetHeader className="border-b border-border">
          <SheetTitle className="pr-8">{lead.fullName}</SheetTitle>
          <SheetDescription>
            Created {new Date(lead.createdAt).toLocaleDateString()}
            {lead.source ? ` · ${lead.source}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-4">
          {/* Stage selector */}
          <section className="flex flex-col gap-2">
            <Label>Stage</Label>
            <Select
              value={lead.stageId}
              onValueChange={(v) => {
                const stageId = typeof v === "string" ? v : ""
                if (!stageId || stageId === lead.stageId) return
                moveAction.execute({ leadId: lead.id, stageId })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stage">
                  {(value) =>
                    stages.find((s) => s.id === value)?.name ?? "Stage"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Contact info */}
          <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Contact</p>
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 text-muted-foreground" />
              <span className="truncate">{lead.email ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 text-muted-foreground" />
              <span className="truncate">{lead.phone ?? "—"}</span>
            </div>
          </section>

          {/* Score + notes */}
          <section className="flex flex-col gap-2">
            <Label htmlFor="lead-score">Score (0–100)</Label>
            <div className="flex items-center gap-2">
              <Star className="size-3.5 text-muted-foreground" />
              <Input
                id="lead-score"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-24"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={updateAction.isExecuting || score === lead.score}
                onClick={() =>
                  updateAction.execute({ id: lead.id, score })
                }
              >
                Save score
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={
                  updateAction.isExecuting || notes === (lead.notes ?? "")
                }
                onClick={() =>
                  updateAction.execute({ id: lead.id, notes })
                }
              >
                Save notes
              </Button>
            </div>
          </section>

          {/* Add activity */}
          <section className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Log activity
            </p>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!activityText.trim()) return
                addActivityAction.execute({
                  leadId: lead.id,
                  type: activityType,
                  description: activityText.trim(),
                })
              }}
            >
              <div className="flex items-center gap-2">
                <Select
                  value={activityType}
                  onValueChange={(v) => {
                    if (
                      v === "note" ||
                      v === "call" ||
                      v === "email" ||
                      v === "meeting"
                    ) {
                      setActivityType(v)
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue>
                      {(value) =>
                        typeof value === "string"
                          ? value.charAt(0).toUpperCase() + value.slice(1)
                          : ""
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder="What happened?"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={addActivityAction.isExecuting}
                >
                  <MessageSquarePlus className="size-3.5" />
                  Log
                </Button>
              </div>
            </form>
          </section>

          {/* Activity timeline */}
          <section className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Activity timeline
            </p>
            {activities.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-2 rounded-md border border-border bg-card p-2 text-xs"
                  >
                    <Clock className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {a.type.replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {a.description && (
                        <p className="mt-1 text-foreground">{a.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Convert / lost */}
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            {isConverted ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className="mb-1 inline size-3.5 text-emerald-500" />
                {" "}Converted to client.
                <Link
                  href={`/dashboard/clients/${lead.convertedClientId}`}
                  className="ml-2 text-primary underline-offset-4 hover:underline"
                >
                  Open profile
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={convertAction.isExecuting || !lead.email}
                  onClick={() => convertAction.execute({ id: lead.id })}
                >
                  <ArrowRightCircle className="size-3.5" />
                  Convert to client
                </Button>
                {!isLost && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLostForm((v) => !v)}
                  >
                    <XCircle className="size-3.5" />
                    Mark as lost
                  </Button>
                )}
              </div>
            )}
            {!lead.email && !isConverted && (
              <p className="text-[11px] text-muted-foreground">
                Add an email before converting.
              </p>
            )}
            {showLostForm && !isConverted && (
              <form
                className="flex flex-col gap-2 rounded-md border border-border p-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  lostAction.execute({
                    leadId: lead.id,
                    reason: lostReason.trim() || undefined,
                  })
                }}
              >
                <Label htmlFor="lost-reason" className="text-xs">
                  Reason (optional)
                </Label>
                <Input
                  id="lost-reason"
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="e.g. price, timing, ghosted"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    disabled={lostAction.isExecuting}
                  >
                    Confirm
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
    </>
  )
}
