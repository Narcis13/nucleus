"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Clock, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  createServiceAction,
  deleteServiceAction,
  toggleServiceAction,
  updateServiceAction,
} from "@/lib/actions/services"
import type { Service } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// <ServicesSurface>
//
// Service catalogue CRUD. Create/edit share a single dialog form; list rows
// expose toggle-active, edit, and delete. Consumed by the booking widget,
// micro-site service section, and invoice line items.
// ─────────────────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000),
  price: z
    .string()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      "Use a number with up to 2 decimals",
    ),
  currency: z.string().length(3),
  durationMinutes: z
    .string()
    .refine(
      (v) => v === "" || /^\d+$/.test(v),
      "Minutes must be a whole number",
    ),
  isActive: z.boolean(),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

export function ServicesSurface({
  initialServices,
}: {
  initialServices: Service[]
}) {
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Service | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialServices
    return initialServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    )
  }, [initialServices, search])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (service: Service) => {
    setEditing(service)
    setDialogOpen(true)
  }

  const toggleAction = useAction(toggleServiceAction, {
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't update service."),
  })

  const deleteAction = useAction(deleteServiceAction, {
    onSuccess: () => {
      toast.success("Service deleted.")
      setDeletingId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't delete service.")
      setDeletingId(null)
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services"
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          New service
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {initialServices.length === 0
            ? "No services yet. Create your first offering to start booking and invoicing."
            : "No services match your search."}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((service) => (
            <li
              key={service.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-foreground">
                    {service.name}
                  </span>
                  {!service.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                {service.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="size-3" />
                    {formatPrice(service.price, service.currency)}
                  </span>
                  {service.durationMinutes != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {service.durationMinutes} min
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{service.isActive ? "Active" : "Paused"}</span>
                  <Switch
                    checked={service.isActive}
                    disabled={toggleAction.isExecuting}
                    onCheckedChange={(next) =>
                      toggleAction.execute({
                        id: service.id,
                        isActive: Boolean(next),
                      })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(service)}
                  className="gap-1"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeletingId(service.id)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServiceDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editing}
      />

      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this service?</DialogTitle>
            <DialogDescription>
              The service is removed from your catalogue. Existing appointments
              and invoices that reference it keep their historical values.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeletingId(null)}
              disabled={deleteAction.isExecuting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAction.isExecuting}
              onClick={() =>
                deletingId && deleteAction.execute({ id: deletingId })
              }
            >
              {deleteAction.isExecuting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ServiceDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
}) {
  const isEdit = Boolean(service)

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    values: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      price: service?.price ?? "",
      currency: service?.currency ?? "EUR",
      durationMinutes:
        service?.durationMinutes != null ? String(service.durationMinutes) : "",
      isActive: service?.isActive ?? true,
    },
  })

  const createAction = useAction(createServiceAction, {
    onSuccess: () => {
      toast.success("Service created.")
      form.reset()
      onOpenChange(false)
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't create service."),
  })

  const updateAction = useAction(updateServiceAction, {
    onSuccess: () => {
      toast.success("Service updated.")
      onOpenChange(false)
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't update service."),
  })

  const pending = createAction.isExecuting || updateAction.isExecuting

  const onSubmit = (values: ServiceFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || null,
      price:
        values.price === undefined || values.price === ""
          ? null
          : Number(values.price),
      currency: values.currency.toUpperCase(),
      durationMinutes:
        values.durationMinutes === undefined || values.durationMinutes === ""
          ? null
          : Number(values.durationMinutes),
      isActive: values.isActive,
    }

    if (isEdit && service) {
      updateAction.execute({ id: service.id, ...payload })
    } else {
      createAction.execute(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit service" : "New service"}
          </DialogTitle>
          <DialogDescription>
            Services appear on your booking widget, micro-site, and invoice
            line-item suggestions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="60-min coaching session" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="What's included?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={3}
                        placeholder="EUR"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="60" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Inactive services are hidden from public booking and
                      micro-site listings.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                    ? "Save changes"
                    : "Create service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function formatPrice(
  price: string | null,
  currency: string,
): string {
  if (!price) return "Free"
  const n = Number(price)
  if (!Number.isFinite(n)) return "Free"
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n)
}
