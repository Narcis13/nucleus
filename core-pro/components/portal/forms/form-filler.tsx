"use client"

import { CheckCircle2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { FormRenderer } from "@/components/shared/forms/form-renderer"
import { submitFormResponseAction } from "@/lib/actions/forms"
import type { FormResponseData, FormSchema } from "@/types/forms"

// Client component that wraps <FormRenderer> with submit wiring. Shows a
// completed state with the submitted values when the assignment is already
// closed — clients can view their past answers, but not edit them.
export function FormFiller({
  assignmentId,
  schema,
  submitted,
  existingResponse,
}: {
  assignmentId: string
  schema: FormSchema
  submitted: boolean
  existingResponse: FormResponseData | null
}) {
  const router = useRouter()
  const action = useAction(submitFormResponseAction, {
    onSuccess: () => {
      toast.success("Submitted — thank you!")
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't submit form.")
    },
  })

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-primary/5 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          You&apos;ve already submitted this form. Your answers are shown below.
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <FormRenderer
            schema={schema}
            mode="readonly"
            initialData={existingResponse ?? {}}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <FormRenderer
        schema={schema}
        mode="fill"
        submitting={action.isExecuting}
        onSubmit={async (data) => {
          action.execute({ assignmentId, data })
        }}
      />
    </div>
  )
}
