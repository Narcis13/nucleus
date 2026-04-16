"use client"

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
  createEmailCampaignAction,
  sendCampaignAction,
  updateEmailCampaignAction,
} from "@/lib/actions/marketing"
import {
  CAMPAIGN_TEMPLATES,
  type CampaignTemplateKey,
  expandMergeTags,
  getCampaignTemplate,
} from "@/lib/marketing/templates"
import type { EmailCampaign, EmailCampaignAudience } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <EmailCampaignBuilder>
//
// Two-column form: the left column picks a template, names the campaign,
// authors the subject + body, and selects an audience. The right column
// renders a live preview of the HTML with merge tags expanded against a
// sample client so the pro sees what actually lands in an inbox.
// ─────────────────────────────────────────────────────────────────────────────

type Audience = EmailCampaignAudience

type Props = {
  tags: Array<{ id: string; name: string; color: string | null }>
  professionalName: string
  initial?: EmailCampaign
  onDone: () => void
}

const DEFAULT_TEMPLATE_KEY: CampaignTemplateKey = "welcome"

const AUDIENCE_STATUSES: Array<{ value: string; label: string }> = [
  { value: "active", label: "Active clients" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Inactive" },
]

export function EmailCampaignBuilder({
  tags,
  professionalName,
  initial,
  onDone,
}: Props) {
  const [templateKey, setTemplateKey] = useState<CampaignTemplateKey>(
    (initial?.templateKey as CampaignTemplateKey) ?? DEFAULT_TEMPLATE_KEY,
  )
  const [name, setName] = useState(initial?.name ?? "")
  const [subject, setSubject] = useState(
    initial?.subject ?? CAMPAIGN_TEMPLATES[DEFAULT_TEMPLATE_KEY].subject,
  )
  const [bodyHtml, setBodyHtml] = useState(
    initial?.bodyHtml ?? CAMPAIGN_TEMPLATES[DEFAULT_TEMPLATE_KEY].body,
  )
  const [audience, setAudience] = useState<Audience>(
    (initial?.audience as Audience) ?? { type: "all_clients" },
  )

  const createAction = useAction(createEmailCampaignAction, {
    onSuccess: () => {
      toast.success("Draft saved.")
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't save campaign.")
    },
  })

  const updateAction = useAction(updateEmailCampaignAction, {
    onSuccess: () => {
      toast.success("Campaign updated.")
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update campaign.")
    },
  })

  const sendNowAction = useAction(sendCampaignAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Delivered to ${data?.delivered ?? 0} of ${data?.total ?? 0} recipients.`,
      )
      onDone()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't send campaign.")
    },
  })

  const submitting =
    createAction.isPending || updateAction.isPending || sendNowAction.isPending

  function applyTemplate(key: CampaignTemplateKey) {
    setTemplateKey(key)
    const template = getCampaignTemplate(key)
    // Only overwrite copy if the user hasn't customised it yet — we treat
    // "same as another template's default" as "unchanged".
    const looksDefault = Object.values(CAMPAIGN_TEMPLATES).some(
      (t) => t.subject === subject && t.body === bodyHtml,
    )
    if (looksDefault || !subject) {
      setSubject(template.subject)
      setBodyHtml(template.body)
    }
    if (!name) setName(template.name)
  }

  const previewHtml = useMemo(() => {
    return expandMergeTags(bodyHtml, {
      client_name: "Alex",
      professional_name: professionalName,
      portal_url: "https://app.example.com/portal",
      booking_url: "https://app.example.com/portal/calendar",
      site_url: "https://app.example.com",
    })
  }, [bodyHtml, professionalName])

  function buildPayload(): {
    name: string
    templateKey: string
    subject: string
    bodyHtml: string
    audience: Audience
  } {
    return {
      name: name.trim() || "Untitled campaign",
      templateKey,
      subject: subject.trim(),
      bodyHtml,
      audience,
    }
  }

  async function handleSaveDraft() {
    const payload = buildPayload()
    if (initial) {
      updateAction.execute({ id: initial.id, ...payload })
    } else {
      createAction.execute(payload)
    }
  }

  async function handleSendNow() {
    const payload = buildPayload()
    if (initial) {
      // Save changes first, then send.
      updateAction.execute({ id: initial.id, ...payload })
      // Defer send slightly — action runs are optimistic; if update fails the
      // toast surfaces.
      sendNowAction.execute({ id: initial.id })
      return
    }
    // For fresh campaigns: create, then send in a follow-up action. We need
    // the id back from create, so we hand-roll the sequential promise chain.
    const created = await createAction.executeAsync(payload)
    if (created?.data?.id) {
      sendNowAction.execute({ id: created.data.id })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-4">
        <div className="space-y-2">
          <Label>Start from a template</Label>
          <Select
            value={templateKey}
            onValueChange={(v) =>
              v && applyTemplate(v as CampaignTemplateKey)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CAMPAIGN_TEMPLATES).map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name} — <span className="text-muted-foreground">{t.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Internal name</Label>
          <Input
            id="name"
            placeholder="e.g. March newsletter"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject line</Label>
          <Input
            id="subject"
            placeholder="What should the inbox say?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use <code>{"{{client_name}}"}</code> for a personal greeting.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">HTML body</Label>
          <Textarea
            id="body"
            rows={12}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Merge tags:{" "}
            <code>{"{{client_name}}"}</code>,{" "}
            <code>{"{{professional_name}}"}</code>,{" "}
            <code>{"{{portal_url}}"}</code>,{" "}
            <code>{"{{booking_url}}"}</code>.
          </p>
        </div>

        <AudiencePicker
          audience={audience}
          onChange={setAudience}
          tags={tags}
        />

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onDone} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={handleSendNow} disabled={submitting}>
            {submitting ? "Sending…" : "Send now"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-2">
        <Label>Preview</Label>
        <div className="overflow-hidden rounded-lg border bg-muted">
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            className="h-[640px] w-full bg-white"
          />
        </div>
      </div>
    </div>
  )
}

function AudiencePicker({
  audience,
  onChange,
  tags,
}: {
  audience: Audience
  onChange: (a: Audience) => void
  tags: Array<{ id: string; name: string; color: string | null }>
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label>Who should receive this?</Label>
      <div className="flex flex-wrap gap-2">
        <AudienceChip
          active={audience.type === "all_clients"}
          onClick={() => onChange({ type: "all_clients" })}
          label="All clients"
        />
        <AudienceChip
          active={audience.type === "status"}
          onClick={() => onChange({ type: "status", status: "active" })}
          label="By status"
        />
        <AudienceChip
          active={audience.type === "tag"}
          onClick={() =>
            onChange({
              type: "tag",
              tagId: tags[0]?.id ?? "",
            })
          }
          label="By tag"
          disabled={tags.length === 0}
        />
      </div>

      {audience.type === "status" && (
        <Select
          value={audience.status}
          onValueChange={(v) =>
            v && onChange({ type: "status", status: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {audience.type === "tag" && tags.length > 0 && (
        <Select
          value={audience.tagId}
          onValueChange={(v) => v && onChange({ type: "tag", tagId: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function AudienceChip({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-muted"
      } ${disabled ? "opacity-50" : ""}`}
    >
      {label}
    </button>
  )
}
