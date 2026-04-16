"use client"

import {
  CheckCircle2,
  Clock,
  FileEdit,
  Mail,
  Plus,
  Send,
  Trash2,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/page-header"
import {
  deleteEmailCampaignAction,
  sendCampaignAction,
} from "@/lib/actions/marketing"
import type { EmailCampaign } from "@/types/domain"

import { EmailCampaignBuilder } from "./email-campaign-builder"

type Props = {
  campaigns: Array<{ campaign: EmailCampaign; recipientCount: number }>
  tags: Array<{ id: string; name: string; color: string | null }>
  professionalName: string
}

export function EmailCampaignsTab({
  campaigns,
  tags,
  professionalName,
}: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<EmailCampaign | null>(null)

  const sendAction = useAction(sendCampaignAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Delivered to ${data?.delivered ?? 0} of ${data?.total ?? 0} recipients.`,
      )
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't send campaign.")
    },
  })

  const deleteAction = useAction(deleteEmailCampaignAction, {
    onSuccess: () => {
      toast.success("Campaign deleted.")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete campaign.")
    },
  })

  const stats = useMemo(() => {
    const total = campaigns.length
    const sent = campaigns.filter((c) => c.campaign.status === "sent").length
    const drafts = campaigns.filter((c) => c.campaign.status === "draft").length
    const delivered = campaigns.reduce(
      (acc, c) => acc + (c.campaign.sentCount ?? 0),
      0,
    )
    return { total, sent, drafts, delivered }
  }, [campaigns])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Campaigns" value={stats.total} icon={Mail} />
        <StatChip label="Drafts" value={stats.drafts} icon={FileEdit} />
        <StatChip label="Sent" value={stats.sent} icon={CheckCircle2} />
        <StatChip label="Emails delivered" value={stats.delivered} icon={Send} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Pick a template, tweak the copy, and send to a client segment. Merge
          tags like <code>{"{{client_name}}"}</code> get substituted per-recipient.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" />
                New campaign
              </Button>
            }
          />
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>New email campaign</DialogTitle>
              <DialogDescription>
                Pick a template, choose your audience, and save as draft or send
                immediately.
              </DialogDescription>
            </DialogHeader>
            <EmailCampaignBuilder
              tags={tags}
              professionalName={professionalName}
              onDone={() => {
                setCreateOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Mail />}
          title="No campaigns yet"
          description="Send your first onboarding email or monthly newsletter in a couple of clicks."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {campaigns.map(({ campaign, recipientCount }) => (
            <Card key={campaign.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{campaign.name}</span>
                  <StatusBadge status={campaign.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="text-sm">
                  <div className="text-muted-foreground">Subject</div>
                  <div className="truncate">{campaign.subject}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Stat label="Audience" value={audienceLabel(campaign, tags)} />
                  <Stat label="Recipients" value={recipientCount} />
                  <Stat
                    label="Delivered"
                    value={campaign.sentCount ?? 0}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {campaign.status !== "sent" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(campaign)}
                      >
                        <FileEdit className="size-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          sendAction.execute({ id: campaign.id })
                        }
                        disabled={sendAction.isPending}
                      >
                        <Send className="size-4" />
                        {sendAction.isPending ? "Sending…" : "Send now"}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${campaign.name}"?`)) {
                        deleteAction.execute({ id: campaign.id })
                      }
                    }}
                    disabled={deleteAction.isPending}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
            <DialogDescription>
              Update your copy or audience. Changes save as a new draft.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <EmailCampaignBuilder
              tags={tags}
              professionalName={professionalName}
              initial={editing}
              onDone={() => {
                setEditing(null)
                router.refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatChip({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Mail
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between py-2">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    draft: { label: "Draft", variant: "outline" },
    scheduled: { label: "Scheduled", variant: "secondary" },
    sending: { label: "Sending", variant: "default" },
    sent: { label: "Sent", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  }
  const meta = map[status] ?? { label: status, variant: "outline" as const }
  return (
    <Badge variant={meta.variant}>
      {status === "sending" && <Clock className="mr-1 size-3" />}
      {meta.label}
    </Badge>
  )
}

function audienceLabel(
  campaign: EmailCampaign,
  tags: Props["tags"],
): string {
  const raw = campaign.audience as
    | { type: string; tagId?: string; status?: string }
    | null
  if (!raw) return "—"
  if (raw.type === "all_clients") return "All clients"
  if (raw.type === "leads_all") return "All leads"
  if (raw.type === "status") return `Status: ${raw.status ?? ""}`
  if (raw.type === "tag") {
    const tag = tags.find((t) => t.id === raw.tagId)
    return tag ? `Tag: ${tag.name}` : "Tag"
  }
  return raw.type
}
