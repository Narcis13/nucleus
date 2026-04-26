"use client"

import { useState } from "react"

import {
  ResponseValueView,
} from "@/components/shared/forms/form-renderer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FormResponse } from "@/types/domain"
import {
  emptyFormSchema,
  isFormSchema,
  type FormResponseData,
  type FormSchema,
} from "@/types/forms"

type Item = {
  response: FormResponse
  form: { id: string; title: string; description: string | null; schema: unknown }
}

// ─────────────────────────────────────────────────────────────────────────────
// <SurveysAboutMeList>
//
// Renders responses where the current portal client is the *subject*
// (e.g. property owner reading viewer surveys about their place). Click
// opens a read-only dialog with each field's submitted value.
// ─────────────────────────────────────────────────────────────────────────────
export function SurveysAboutMeList({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<Item | null>(null)
  const schema: FormSchema = open
    ? isFormSchema(open.form.schema)
      ? open.form.schema
      : emptyFormSchema()
    : emptyFormSchema()

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.response.id}
            type="button"
            onClick={() => setOpen(item)}
            className="text-left"
          >
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {item.form.title}
                  </h3>
                  <Badge variant="secondary">View</Badge>
                </div>
                {item.form.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.form.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Submitted {formatDate(item.response.submittedAt)}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{open?.form.title}</DialogTitle>
            <DialogDescription>
              {open ? `Submitted ${formatDate(open.response.submittedAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {open && (
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
                        (open.response.data as FormResponseData | null)?.[
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
    </>
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
