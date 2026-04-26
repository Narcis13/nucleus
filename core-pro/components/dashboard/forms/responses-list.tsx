"use client"

import { useState } from "react"

import { ResponseValueView } from "@/components/shared/forms/form-renderer"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Client, FormAssignment, FormResponse } from "@/types/domain"
import type { FormResponseData, FormSchema } from "@/types/forms"

// Below-the-fold block on the form editor: shows assignments and submitted
// responses. A response opens in a dialog with per-field read-only views.
export function ResponsesList({
  schema,
  assignments,
  responses,
}: {
  schema: FormSchema
  assignments: Array<
    FormAssignment & {
      client: Pick<Client, "id" | "fullName" | "email"> | null
    }
  >
  responses: Array<
    FormResponse & { client: Pick<Client, "id" | "fullName"> | null }
  >
}) {
  const [openResponse, setOpenResponse] = useState<FormResponse | null>(null)

  if (assignments.length === 0 && responses.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/20 py-6 text-center text-sm text-muted-foreground">
        No assignments yet. Use Assign to send this form to a client.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {responses.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Responses
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {responses.length}
            </span>
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {responses.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted"
                  onClick={() => setOpenResponse(r)}
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {r.client?.fullName ??
                        (r.shareId ? "Public submission" : "Unknown client")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Submitted {formatDate(r.submittedAt)}
                    </span>
                  </span>
                  <Badge variant="secondary">View</Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {assignments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Assignments
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {assignments.length}
            </span>
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {a.client?.fullName ?? "Unknown client"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {a.client?.email ?? ""}
                    {a.dueDate
                      ? ` · due ${formatDate(a.dueDate)}`
                      : ""}
                  </span>
                </span>
                <Badge
                  variant={a.status === "completed" ? "secondary" : "outline"}
                >
                  {a.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={Boolean(openResponse)}
        onOpenChange={(open) => {
          if (!open) setOpenResponse(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Response</DialogTitle>
            <DialogDescription>
              {openResponse
                ? `Submitted ${formatDate(openResponse.submittedAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {openResponse && (
            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
              {schema.fields
                .filter((f) => f.type !== "section")
                .map((field) => (
                  <div key={field.id} className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </p>
                    <ResponseValueView
                      field={field}
                      value={
                        (openResponse.data as FormResponseData | null)?.[
                          field.id
                        ] ?? null
                      }
                    />
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
