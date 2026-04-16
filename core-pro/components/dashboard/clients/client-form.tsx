"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  createClientAction,
  updateClientAction,
} from "@/lib/actions/clients"

// ─────────────────────────────────────────────────────────────────────────────
// <ClientForm>
//
// Create + edit surface shared between the "Add client" dialog on the list and
// the Details tab on the profile page. When `initialValues.id` is set we call
// `updateClientAction`; otherwise we call `createClientAction`.
// ─────────────────────────────────────────────────────────────────────────────

const clientFormSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email"),
  phone: z.string().max(40).optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  locale: z.string().max(10).optional(),
  source: z.string().max(60).optional().or(z.literal("")),
  invite: z.boolean(),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

type ClientFormProps = {
  initialValues?: Partial<ClientFormValues> & { id?: string }
  onDone?: () => void
  submitLabel?: string
}

export function ClientForm({
  initialValues,
  onDone,
  submitLabel,
}: ClientFormProps) {
  const isEdit = Boolean(initialValues?.id)
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      fullName: initialValues?.fullName ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
      dateOfBirth: initialValues?.dateOfBirth ?? "",
      locale: initialValues?.locale ?? "ro",
      source: initialValues?.source ?? "",
      invite: initialValues?.invite ?? false,
    },
  })

  const createAction = useAction(createClientAction, {
    onSuccess: ({ data }) => {
      toast.success(
        data?.invited
          ? "Client added and invited to the portal."
          : "Client added.",
      )
      form.reset()
      onDone?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't add client.")
    },
  })

  const updateAction = useAction(updateClientAction, {
    onSuccess: () => {
      toast.success("Client updated.")
      onDone?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't update client.")
    },
  })

  const isPending =
    createAction.isExecuting || updateAction.isExecuting

  const onSubmit = (values: ClientFormValues) => {
    if (isEdit && initialValues?.id) {
      updateAction.execute({
        id: initialValues.id,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || null,
        dateOfBirth: values.dateOfBirth || null,
        locale: values.locale,
        source: values.source || null,
      })
    } else {
      createAction.execute(values)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Jane Doe" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="jane@example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+40…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="YYYY-MM-DD" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locale</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ro" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Referral, web…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isEdit && (
          <FormField
            control={form.control}
            name="invite"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-md border border-border p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(Boolean(v))}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="text-sm">
                    Invite to client portal
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Sends a Clerk invitation email so they can sign in and see
                    their portal.
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEdit
                ? "Saving…"
                : "Adding…"
              : (submitLabel ?? (isEdit ? "Save changes" : "Add client"))}
          </Button>
        </div>
      </form>
    </Form>
  )
}
