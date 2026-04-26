"use client"

import { Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { revokePublicShareAction } from "@/lib/actions/forms"
import type { Client, FormPublicShare } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <PublicSharesList>
//
// Shows active + historic public shares for a form. The raw URL is *not*
// stored — only sha256(token) — so there's no "copy link" here. To recover
// a lost URL the agent revokes and creates a new share.
// ─────────────────────────────────────────────────────────────────────────────
export function PublicSharesList({
  formId,
  shares,
}: {
  formId: string
  shares: Array<
    Omit<FormPublicShare, "tokenHash"> & {
      subjectClient: Pick<Client, "id" | "fullName"> | null
    }
  >
}) {
  const revokeAction = useAction(revokePublicShareAction, {
    onSuccess: () => toast.success("Share revoked."),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't revoke share."),
  })

  if (shares.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-semibold text-foreground">
        Public links
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {shares.length}
        </span>
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {shares.map((s) => {
          const status = computeStatus(s)
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {s.subjectClient
                    ? `About ${s.subjectClient.fullName}`
                    : "No subject"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.responseCount}/{s.maxResponses} responses
                  {s.expiresAt
                    ? ` · expires ${formatDate(s.expiresAt)}`
                    : " · never expires"}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {status.label === "active" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      revokeAction.execute({ id: s.id, formId })
                    }
                    disabled={revokeAction.isExecuting}
                    aria-label="Revoke share"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

type StatusBadge = {
  label: "active" | "revoked" | "expired" | "used up"
  variant: "default" | "secondary" | "outline" | "destructive"
}

function computeStatus(s: Omit<FormPublicShare, "tokenHash">): StatusBadge {
  if (s.revokedAt) return { label: "revoked", variant: "destructive" }
  if (s.expiresAt && s.expiresAt.getTime() < Date.now()) {
    return { label: "expired", variant: "secondary" }
  }
  if (s.responseCount >= s.maxResponses) {
    return { label: "used up", variant: "secondary" }
  }
  return { label: "active", variant: "outline" }
}

// Pin the locale so SSR (Node) and hydration (browser) emit identical text;
// `toLocaleDateString(undefined, …)` picks up host locale and diverges.
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
