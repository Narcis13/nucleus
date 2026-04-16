"use client"

import { ChevronDown, FilePlus, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createFormAction } from "@/lib/actions/forms"
import { FORM_TEMPLATES } from "@/lib/forms/templates"

// Dropdown trigger on the forms list: lets the pro create a blank form or a
// form seeded from a built-in template. Uses the same `createFormAction` in
// both cases — only the `schema` payload differs. On success we navigate
// straight to the editor so the pro can start tweaking.
export function CreateFormMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const action = useAction(createFormAction, {
    onSuccess: ({ data }) => {
      if (data?.id) {
        toast.success("Form created.")
        router.push(`/dashboard/forms/${data.id}/edit`)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't create form.")
    },
  })

  const createBlank = () => {
    action.execute({
      title: "Untitled form",
      schema: { version: 1, fields: [] },
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button size="sm" disabled={action.isExecuting}>
            <FilePlus className="size-3.5" />
            {action.isExecuting ? "Creating…" : "New form"}
            <ChevronDown className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={createBlank}>
          <FilePlus className="size-3.5" />
          Blank form
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3" />
            From template
          </span>
        </DropdownMenuLabel>
        {FORM_TEMPLATES.map((t) => (
          <DropdownMenuItem
            key={t.key}
            onClick={() =>
              action.execute({
                title: t.title,
                description: t.description,
                schema: t.schema,
              })
            }
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{t.title}</span>
              <span className="text-xs text-muted-foreground">
                {t.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
