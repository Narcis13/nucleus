"use client"

import { CheckCircle2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { FormRenderer } from "@/components/shared/forms/form-renderer"
import { submitPublicFormResponseAction } from "@/lib/actions/forms"
import type { FormSchema } from "@/types/forms"

// Wraps the shared FormRenderer for the anonymous /share/[token] route. On
// success we swap to a thank-you state instead of router.refresh() — there
// is no portal session to navigate within.
export function PublicFormFiller({
  token,
  schema,
  title,
  description,
}: {
  token: string
  schema: FormSchema
  title: string
  description: string | null
}) {
  const [submitted, setSubmitted] = useState(false)

  const action = useAction(submitPublicFormResponseAction, {
    onSuccess: () => {
      toast.success("Submitted — thank you!")
      setSubmitted(true)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't submit form.")
    },
  })

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Thanks for your feedback
        </h2>
        <p className="text-sm text-muted-foreground">
          Your response has been recorded. You can close this page.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <FormRenderer
        schema={schema}
        mode="fill"
        title={title}
        description={description}
        submitting={action.isExecuting}
        onSubmit={async (data) => {
          action.execute({ token, data })
        }}
      />
    </div>
  )
}
